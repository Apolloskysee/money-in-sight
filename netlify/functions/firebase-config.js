exports.handler = async function(event, context) {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    if (event.httpMethod !== 'GET') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        const firebaseConfig = {
            apiKey: process.env.FIREBASE_API_KEY,
            authDomain: process.env.FIREBASE_AUTH_DOMAIN,
            projectId: process.env.FIREBASE_PROJECT_ID,
            storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
            messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
            appId: process.env.FIREBASE_APP_ID
        };

        // Проверяем, что все переменные окружения установлены
        const missingVars = Object.entries(firebaseConfig)
            .filter(([key, value]) => !value)
            .map(([key]) => key);

        if (missingVars.length > 0) {
            console.error('Missing Firebase environment variables:', missingVars);
            
            // В режиме разработки возвращаем демо-конфиг
            if (process.env.NODE_ENV !== 'production') {
                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({
                        apiKey: "demo-api-key",
                        authDomain: "demo.firebaseapp.com",
                        projectId: "demo-project",
                        storageBucket: "demo.appspot.com",
                        messagingSenderId: "123456789",
                        appId: "1:123456789:web:demo",
                        demo: true
                    })
                };
            }
            
            throw new Error(`Missing Firebase config: ${missingVars.join(', ')}`);
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(firebaseConfig)
        };

    } catch (error) {
        console.error('Error getting Firebase config:', error);
        
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                error: 'Internal server error',
                message: process.env.NODE_ENV === 'development' ? error.message : 'Configuration error'
            })
        };
    }
};