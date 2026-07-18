// netlify/functions/proxy-mistral.js

export default async (req) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
    };

    // Обработка CORS preflight запросов
    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers });
    }

    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method Not Allowed' }), { status: 405, headers });
    }

    const apiKey = process.env.MISTRAL_API_KEY;
    if (!apiKey) {
        return new Response(JSON.stringify({ error: 'Mistral API key is not configured on the server.' }), { status: 500, headers });
    }

    try {
        const body = await req.json();
        const { messages, model = "mistral-small-2603", temperature = 0.3, stream = false } = body;

        const mistralResponse = await fetch('https://api.mistral.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({ model, messages, temperature, stream })
        });

        if (!mistralResponse.ok) {
            const errorText = await mistralResponse.text();
            return new Response(JSON.stringify({ error: `Mistral API error: ${errorText}` }), {
                status: mistralResponse.status,
                headers
            });
        }

        if (stream) {
            // Нативно проксируем поток (ReadableStream) от Mistral напрямую в браузер клиента
            return new Response(mistralResponse.body, {
                status: 200,
                headers: {
                    ...headers,
                    'Content-Type': 'text/event-stream',
                    'Cache-Control': 'no-cache',
                    'Connection': 'keep-alive'
                }
            });
        } else {
            const data = await mistralResponse.json();
            return new Response(JSON.stringify(data), {
                status: 200,
                headers
            });
        }

    } catch (error) {
        return new Response(JSON.stringify({ error: 'Internal server error', details: error.message }), {
            status: 500,
            headers
        });
    }
};