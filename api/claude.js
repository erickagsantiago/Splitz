export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch(e) {}
    }
    
    if (!body || !body.model) {
      return res.status(200).json({ 
        content: [{ type: 'text', text: 'DEBUG: no model in body. keys=' + JSON.stringify(Object.keys(body||{})) }] 
      });
    }

    body.stream = false;

    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(body)
    });

    const text = await r.text();
    
    // Return raw text so app can parse it
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).send(text);

  } catch(e) {
    return res.status(200).json({ 
      content: [{ type: 'text', text: 'DEBUG error: ' + e.message }] 
    });
  }
}

export const config = { api: { bodyParser: { sizeLimit: '15mb' } } };
