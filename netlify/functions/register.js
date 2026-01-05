const admin = require('firebase-admin');

// Инициализация Firebase Admin (один раз)
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
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        const { name, email, password } = JSON.parse(event.body || '{}');

        // Валидация
        if (!name || !email || !password) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Все поля обязательны' })
            };
        }

        if (password.length < 6) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ 
                    error: 'Пароль должен содержать минимум 6 символов' 
                })
            };
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Неверный формат email' })
            };
        }

        // Создаем пользователя в Firebase Auth
        const userRecord = await admin.auth().createUser({
            email: email.toLowerCase(),
            password: password,
            displayName: name,
            emailVerified: false
        });

        // Сохраняем в Firestore
        const db = admin.firestore();
        const trialEndDate = new Date();
        trialEndDate.setDate(trialEndDate.getDate() + 14);

        await db.collection('users').doc(userRecord.uid).set({
            name: name,
            email: email.toLowerCase(),
            emailVerified: false,
            subscription: 'trial',
            trialEndDate: trialEndDate.toISOString(),
            subscriptionActive: true,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            lastLogin: admin.firestore.FieldValue.serverTimestamp()
        });

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ 
                success: true, 
                message: 'Регистрация успешна',
                userId: userRecord.uid,
                email: email,
                name: name
            })
        };

    } catch (error) {
        console.error('Registration error:', error);
        
        let errorMessage = 'Ошибка регистрации';
        let statusCode = 400;

        switch (error.code) {
            case 'auth/email-already-in-use':
                errorMessage = 'Пользователь с таким email уже зарегистрирован';
                break;
            case 'auth/invalid-email':
                errorMessage = 'Неверный формат email';
                break;
            case 'auth/weak-password':
                errorMessage = 'Пароль слишком слабый';
                break;
            case 'auth/network-request-failed':
                errorMessage = 'Ошибка сети. Проверьте подключение';
                break;
            default:
                statusCode = 500;
                errorMessage = 'Внутренняя ошибка сервера';
        }

        return {
            statusCode: statusCode,
            headers,
            body: JSON.stringify({ 
                error: errorMessage,
                details: process.env.NODE_ENV === 'development' ? error.message : undefined
            })
        };
    }
};