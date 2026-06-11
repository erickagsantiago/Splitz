// Hardened Claude proxy for Splitz
// - Model and token limits are enforced server-side (client cannot override)
// - POST requests must come from the Splitz app (referer/origin check)
// - GET = diagnostic self-test

const ALLOWED_HOST = 'splitz-flxl.vercel.app';
const FORCED_MODEL = 'claude-sonnet-4-6';
const MAX_TOKENS_CAP = 2000;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://' + ALLOWED_HOST);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const apiKey = (process.env.ANTHROPIC_API_KEY || '').trim();

  // GET = diagnostic self-test (open /api/claude in a browser)
  if (req.method === 'GET') {
    const info = {
      keyPresent: !!apiKey,
      keyLength: apiKey.length,
      keyStartsWithSkAnt: apiKey.startsWith('sk-ant-'),
      keyHasWhitespaceInside: /\s/.test(apiKey)
    };
    try {
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: FORCED_MODEL,
          max_tokens: 5,
          messages: [{ role: 'user', content: 'hi' }]
        })
      });
      info.anthropicStatus = r.status;
      info.anthropicSays = await r.json();
    } catch (e) {
      info.fetchError = e.message;
    }
    return res.status(200).json(info);
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  // Only accept requests originating from the Splitz app
  const origin = req.headers.origin || '';
  const referer = req.headers.referer || '';
  if (!origin.includes(ALLOWED_HOST) && !referer.includes(ALLOWED_HOST)) {
    return res.status(403).json({ error: { type: 'forbidden', message: 'Requests must come from the Splitz app' } });
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch (e) {}
    }
    if (!body || !body.messages) {
      return res.status(200).json({
        error: { type: 'proxy_debug', message: 'Body missing messages. Got keys: ' + Object.keys(body || {}).join(',') }
      });
    }

    // Server-enforced limits — client cannot choose model or exceed token cap
    body.model = FORCED_MODEL;
    body.max_tokens = Math.min(Number(body.max_tokens) || 1500, MAX_TOKENS_CAP);
    body.stream = false;

    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(body)
    });
    const text = await r.text();
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).send(text);
  } catch (e) {
    return res.status(200).json({ error: { type: 'proxy_error', message: e.message } });
  }
}
export const config = { api: { bodyParser: { sizeLimit: '15mb' } } };
