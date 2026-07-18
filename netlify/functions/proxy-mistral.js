// netlify/functions/proxy-mistral.js

exports.handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
    };

    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 204,
            headers,
            body: ''
        };
    }

    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method Not Allowed' })
        };
    }

    const apiKey = process.env.MISTRAL_API_KEY;
    if (!apiKey) {
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Mistral API key is not configured on the server.' })
        };
    }

    let body;
    try {
        body = JSON.parse(event.body);
    } catch (err) {
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Invalid JSON body' })
        };
    }

    const { messages, model = "mistral-small-2603", temperature = 0.3, stream = false } = body;

    try {
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
            return {
                statusCode: mistralResponse.status,
                headers,
                body: JSON.stringify({ error: `Mistral API error: ${errorText}` })
            };
        }

        if (stream) {
            const textData = await mistralResponse.text();
            return {
                statusCode: 200,
                headers: {
                    ...headers,
                    'Content-Type': 'text/event-stream',
                    'Cache-Control': 'no-cache',
                    'Connection': 'keep-alive'
                },
                body: textData
            };
        } else {
            const data = await mistralResponse.json();
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify(data)
            };
        }

    } catch (error) {
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Internal server error', details: error.message })
        };
    }
};