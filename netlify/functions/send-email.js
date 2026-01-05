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
        const { to_email, user_name, verification_code, type = 'verification' } = 
            JSON.parse(event.body || '{}');

        if (!to_email) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Email обязателен' })
            };
        }

        // В режиме разработки - логируем
        if (process.env.NODE_ENV !== 'production') {
            console.log('DEMO MODE: Email would be sent to:', to_email);
            console.log('Type:', type, 'Code:', verification_code);
            
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ 
                    success: true,
                    message: 'Email sent (demo mode)',
                    code: verification_code,
                    demo: true
                })
            };
        }

        // Проверяем наличие EmailJS ключей
        if (!process.env.EMAILJS_SERVICE_ID || !process.env.EMAILJS_TEMPLATE_ID || !process.env.EMAILJS_PUBLIC_KEY) {
            console.error('EmailJS credentials not configured');
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
                type: type
            }
        };

        const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(emailData),
            timeout: 10000
        });

        const responseText = await response.text();

        if (!response.ok) {
            console.error('EmailJS API Error:', response.status, responseText);
            return {
                statusCode: response.status,
                headers,
                body: JSON.stringify({ 
                    success: false,
                    error: 'Failed to send email',
                    details: responseText
                })
            };
        }

        console.log('Email sent successfully to:', to_email);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ 
                success: true,
                message: 'Email sent successfully'
            })
        };

    } catch (error) {
        console.error('Error sending email:', error);
        
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                error: 'Failed to send email',
                message: error.message
            })
        };
    }
};