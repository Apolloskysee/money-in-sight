const { v4: uuidv4 } = require('uuid');

exports.handler = async function(event, context) {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
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
        const { 
            email, 
            userId, 
            amount = 199, 
            description = 'Премиум подписка Money in Sight - 1 месяц',
            paymentMethod = 'bank_card'
        } = body;

        // Валидация
        if (!email || !userId) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ 
                    success: false,
                    error: 'Отсутствуют обязательные поля',
                    required: ['email', 'userId'] 
                })
            };
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ 
                    success: false,
                    error: 'Неверный формат email' 
                })
            };
        }

        // В демо-режиме возвращаем заглушку
        if (!process.env.YOOMONEY_SHOP_ID || !process.env.YOOMONEY_SECRET_KEY) {
            console.log('DEMO MODE: Payment creation for', email);
            
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    success: true,
                    paymentId: 'demo_' + Date.now(),
                    confirmationUrl: `${event.headers.origin || 'https://money-in-sight.netlify.app'}/payment-success`,
                    status: 'pending',
                    amount: amount,
                    description: description,
                    demo: true
                })
            };
        }

        // Создание платежа в ЮKassa
        const paymentData = {
            amount: {
                value: amount.toFixed(2),
                currency: "RUB"
            },
            capture: true,
            description: description,
            metadata: {
                userId: userId,
                userEmail: email,
                product: 'premium_subscription_monthly',
                timestamp: new Date().toISOString()
            },
            confirmation: {
                type: "redirect",
                return_url: `${event.headers.origin || 'https://money-in-sight.netlify.app'}/payment-success`
            },
            receipt: {
                customer: {
                    email: email
                },
                items: [
                    {
                        description: description,
                        quantity: "1.00",
                        amount: {
                            value: amount.toFixed(2),
                            currency: "RUB"
                        },
                        vat_code: 1,
                        payment_mode: "full_payment",
                        payment_subject: "service"
                    }
                ]
            }
        };

        // Yookassa API v3 не требует явного указания payment_method_data для типа bank_card
        // Он автоматически использует доступные методы оплаты

        const idempotenceKey = uuidv4();
        const auth = Buffer.from(`${process.env.YOOMONEY_SHOP_ID}:${process.env.YOOMONEY_SECRET_KEY}`).toString('base64');

        console.log('Creating payment for:', email, 'amount:', amount);

        const response = await fetch('https://api.yookassa.ru/v3/payments', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${auth}`,
                'Idempotence-Key': idempotenceKey
            },
            body: JSON.stringify(paymentData)
        });

        const responseText = await response.text();
        
        if (!response.ok) {
            console.error('YooKassa API Error:', response.status, responseText);
            
            let errorData;
            try {
                errorData = JSON.parse(responseText);
            } catch {
                errorData = { description: responseText };
            }
            
            return {
                statusCode: response.status,
                headers,
                body: JSON.stringify({ 
                    success: false,
                    error: 'Payment creation failed',
                    details: errorData,
                    status: response.status
                })
            };
        }

        const result = JSON.parse(responseText);
        
        console.log('Payment created successfully:', result.id);
        
        if (!result.confirmation || !result.confirmation.confirmation_url) {
            throw new Error('No confirmation URL received from YooKassa');
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                paymentId: result.id,
                confirmationUrl: result.confirmation.confirmation_url,
                status: result.status,
                amount: result.amount,
                description: result.description,
                createdAt: result.created_at
            })
        };

    } catch (error) {
        console.error('Payment creation error:', error);
        
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                success: false,
                error: 'Internal Server Error',
                message: error.message,
                stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
            })
        };
    }
};