exports.handler = async function(event, context) {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    try {
        let paymentId;
        
        if (event.httpMethod === 'GET') {
            paymentId = event.queryStringParameters?.paymentId;
        } else if (event.httpMethod === 'POST') {
            const body = JSON.parse(event.body || '{}');
            paymentId = body.paymentId;
        } else {
            return {
                statusCode: 405,
                headers,
                body: JSON.stringify({ error: 'Method Not Allowed' })
            };
        }

        if (!paymentId) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ 
                    success: false,
                    error: 'paymentId is required'
                })
            };
        }

        // Демо-режим
        if (paymentId.startsWith('demo_')) {
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    success: true,
                    paymentId: paymentId,
                    status: 'succeeded',
                    amount: { value: '199.00', currency: 'RUB' },
                    description: 'Премиум подписка Money in Sight - 1 месяц',
                    metadata: { userId: 'demo', userEmail: 'demo@example.com' },
                    paid: true,
                    demo: true
                })
            };
        }

        // Реальный запрос к ЮKassa
        if (!process.env.YOOMONEY_SHOP_ID || !process.env.YOOMONEY_SECRET_KEY) {
            console.error('Payment credentials not configured');
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ 
                    success: false,
                    error: 'Payment service not configured'
                })
            };
        }
        
        console.log('Checking payment status for:', paymentId);
        
        const auth = Buffer.from(`${process.env.YOOMONEY_SHOP_ID}:${process.env.YOOMONEY_SECRET_KEY}`).toString('base64');
        
        const response = await fetch(`https://api.yookassa.ru/v3/payments/${paymentId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${auth}`
            },
            timeout: 10000
        });

        const responseText = await response.text();
        
        if (!response.ok) {
            console.error('YooKassa API Error:', response.status, responseText);
            
            return {
                statusCode: response.status,
                headers,
                body: JSON.stringify({ 
                    success: false,
                    error: 'Failed to check payment status',
                    status: response.status
                })
            };
        }

        const result = JSON.parse(responseText);
        
        console.log('Payment status:', result.id, '-', result.status);
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                paymentId: result.id,
                status: result.status,
                amount: result.amount,
                description: result.description,
                metadata: result.metadata,
                paid: result.status === 'succeeded',
                captured: result.status === 'succeeded',
                createdAt: result.created_at,
                capturedAt: result.captured_at
            })
        };

    } catch (error) {
        console.error('Check payment error:', error);
        
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                success: false,
                error: 'Internal Server Error',
                message: error.message
            })
        };
    }
};