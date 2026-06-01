export const config = {
  runtime: 'edge'
};

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
  }

  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    
    // Debug: return key status
    if (!apiKey) {
      return new Response(JSON.stringify({ 
        debug: 'NO_API_KEY',
        content: [{ text: 'no key found' }] 
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    const body = await req.json();
    body.stream = false;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(body)
    });

    const text = await response.text();
    
    // If response looks empty or wrong, show status
    if (!text || text.length < 10) {
      return new Response(JSON.stringify({
        debug: 'EMPTY_RESPONSE',
        status: response.status,
        content: [{ text: 'empty from anthropic: ' + response.status }]
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    return new Response(text, {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });

  } catch (e) {
    return new Response(JSON.stringify({ 
      debug: 'EXCEPTION: ' + e.message,
      content: [{ text: 'error: ' + e.message }] 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
}
