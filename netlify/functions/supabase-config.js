// netlify/functions/supabase-config.js

exports.handler = async (event) => {
    // Настройка заголовков CORS для взаимодействия с внешними доменами (например, вашим WebApp)
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, OPTIONS'
    };

    // Обработка предварительных preflight-запросов
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 204,
            headers,
            body: ''
        };
    }

    if (event.httpMethod !== 'GET') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method Not Allowed' })
        };
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Supabase configuration is not set on the server.' })
        };
    }

    return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ supabaseUrl, supabaseAnonKey })
    };
};