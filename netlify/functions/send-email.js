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
        const { to_email, user_name, verification_code, user_id, expires_at, type = 'verification' } = 
            JSON.parse(event.body || '{}');

        // Валидация входных данных
        if (!to_email) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Email обязателен' })
            };
        }

        if (!verification_code) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Код верификации обязателен' })
            };
        }

        console.log(`📧 Попытка отправки кода верификации на ${to_email} (тип: ${type})`);

        // В режиме разработки - логируем и сохраняем код в Firestore для локального тестирования
        if (process.env.NODE_ENV !== 'production') {
            console.log('🔧 РЕЖИМ РАЗРАБОТКИ: Email будет отправлен на:', to_email);
            console.log('📌 Код верификации:', verification_code);
            console.log('⏰ Срок действия:', expires_at);

            // Сохраняем код на сервере для демо-режима
            if (user_id) {
                try {
                    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
                    if (serviceAccountJson) {
                        const admin = require('firebase-admin');
                        if (!admin.apps.length) {
                            admin.initializeApp({
                                credential: admin.credential.cert(JSON.parse(serviceAccountJson)),
                                databaseURL: process.env.FIREBASE_DATABASE_URL
                            });
                        }
                        const db = admin.firestore();

                        await db.collection('verificationCodes').doc(user_id).set({
                            code: verification_code,
                            email: to_email,
                            userId: user_id,
                            expiresAt: expires_at,
                            attempts: 0,
                            createdAt: admin.firestore.FieldValue.serverTimestamp(),
                            type: type
                        });
                        console.log(`✅ Код верификации сохранен в Firestore для пользователя ${user_id}`);
                    }
                } catch (demoStoreErr) {
                    console.error('⚠️ Ошибка сохранения кода в демо-режиме:', demoStoreErr);
                }
            }

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ 
                    success: true,
                    message: 'Email sent (dev mode)',
                    code: verification_code,
                    dev_mode: true
                })
            };
        }

        // PRODUCTION: Проверяем наличие EmailJS ключей
        if (!process.env.EMAILJS_SERVICE_ID || !process.env.EMAILJS_TEMPLATE_ID || !process.env.EMAILJS_PUBLIC_KEY) {
            console.error('❌ EmailJS credentials not configured');
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ 
                    error: 'Email service not configured',
                    success: false
                })
            };
        }

        // Отправляем через EmailJS API
        const emailData = {
            service_id: process.env.EMAILJS_SERVICE_ID,
            template_id: process.env.EMAILJS_TEMPLATE_ID,
            user_id: process.env.EMAILJS_PUBLIC_KEY,
            template_params: {
                to_email: to_email,
                user_name: user_name || 'пользователь',
                verification_code: verification_code,
                email_type: type === 'registration' ? 'Подтверждение регистрации' : 'Подтверждение email'
            }
        };

        console.log('📤 Отправка Email через EmailJS...');

        const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(emailData),
            timeout: 10000
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`❌ Ошибка EmailJS API (статус ${response.status}):`, errorText);
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ 
                    success: false,
                    error: 'Не удалось отправить письмо. Пожалуйста, попробуйте позже.',
                    details: process.env.NODE_ENV === 'production' ? undefined : errorText
                })
            };
        }

        console.log(`✅ Email успешно отправлен на ${to_email}`);

        // Сохраняем код в Firestore (если доступен service account)
        if (user_id) {
            try {
                const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
                if (serviceAccountJson) {
                    const admin = require('firebase-admin');
                    
                    // Переиспользуем существующее приложение или создаем новое
                    let db;
                    if (admin.apps && admin.apps.length > 0) {
                        db = admin.firestore();
                    } else {
                        admin.initializeApp({
                            credential: admin.credential.cert(JSON.parse(serviceAccountJson)),
                            databaseURL: process.env.FIREBASE_DATABASE_URL
                        });
                        db = admin.firestore();
                    }

                    await db.collection('verificationCodes').doc(user_id).set({
                        code: verification_code,
                        email: to_email,
                        userId: user_id,
                        expiresAt: expires_at,
                        attempts: 0,
                        createdAt: admin.firestore.FieldValue.serverTimestamp(),
                        type: type
                    });
                    console.log(`✅ Код верификации сохранен в Firestore для пользователя ${user_id}`);
                }
            } catch (storeErr) {
                console.error('⚠️ Ошибка сохранения кода в Firestore:', storeErr);
                // Не прерываем процесс - письмо уже отправлено
            }
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ 
                success: true,
                message: 'Email успешно отправлен',
                recipient: to_email
            })
        };

    } catch (error) {
        console.error('❌ Критическая ошибка при отправке email:', error);
        
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                error: 'Не удалось обработать запрос',
                message: process.env.NODE_ENV === 'production' ? undefined : error.message
            })
        };
    }
};