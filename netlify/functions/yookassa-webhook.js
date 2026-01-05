const admin = require('firebase-admin');

// Инициализация Firebase Admin
if (!admin.apps.length) {
    try {
        // Используем переменную окружения FIREBASE_ADMIN_CREDENTIALS
        if (!process.env.FIREBASE_ADMIN_CREDENTIALS) {
            throw new Error('FIREBASE_ADMIN_CREDENTIALS environment variable is not set');
        }
        
        const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_CREDENTIALS);
            
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
    } catch (error) {
        console.error('Firebase admin initialization error:', error);
    }
}

exports.handler = async function(event, context) {
    console.log('Webhook received:', event.httpMethod);
    
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method Not Allowed' })
        };
    }

    try {
        const body = JSON.parse(event.body || '{}');
        const { event: eventType, object } = body;
        
        console.log('Webhook event:', eventType, 'paymentId:', object?.id);

        if (eventType === 'payment.succeeded') {
            const { userId, userEmail } = object.metadata || {};
            
            if (userId) {
                const db = admin.firestore();
                
                // Обновляем подписку пользователя
                await db.collection('users').doc(userId).update({
                    subscription: 'premium',
                    subscriptionActive: true,
                    trialEndDate: null,
                    lastPaymentDate: new Date().toISOString(),
                    paymentId: object.id,
                    premiumSince: admin.firestore.FieldValue.serverTimestamp(),
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                });
                
                // Сохраняем детали платежа
                await db.collection('payments').add({
                    userId,
                    paymentId: object.id,
                    amount: object.amount?.value || 199,
                    currency: object.amount?.currency || 'RUB',
                    status: 'succeeded',
                    metadata: object.metadata,
                    createdAt: admin.firestore.FieldValue.serverTimestamp()
                });
                
                console.log('Premium subscription activated for user:', userId);
                
                // Отправляем email подтверждения
                if (userEmail) {
                    try {
                        const fetch = require('node-fetch');
                        await fetch('/.netlify/functions/send-email', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                to_email: userEmail,
                                user_name: object.metadata?.userName || 'Пользователь',
                                type: 'payment_success'
                            })
                        });
                    } catch (emailError) {
                        console.error('Error sending success email:', emailError);
                    }
                }
            }
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ 
                received: true,
                processed: true,
                event: eventType 
            })
        };

    } catch (error) {
        console.error('Webhook processing error:', error);
        
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                error: 'Internal Server Error',
                message: error.message 
            })
        };
    }
};