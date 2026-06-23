const FORCED_MODEL = 'claude-sonnet-4-6';
const MAX_TOKENS_CAP = 2000;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const apiKey = (process.env.ANTHROPIC_API_KEY || '').trim();

  // Lightweight health check — never leak key details.
  if (req.method === 'GET') {
    return res.status(200).json({ ok: true, configured: !!apiKey });
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  if (!apiKey) {
    return res.status(200).json({ error: { type: 'config_error', message: 'Server not configured' } });
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch (e) { body = null; }
    }
    if (!body || !Array.isArray(body.messages) || !body.messages.length) {
      return res.status(400).json({ error: { type: 'bad_request', message: 'messages required' } });
    }

    // This proxy exists solely for receipt OCR. Require at least one image block
    // so the endpoint can't be used as a free general-purpose LLM at the owner's
    // expense.
    const hasImage = body.messages.some(function (m) {
      return Array.isArray(m && m.content) && m.content.some(function (c) {
        return c && c.type === 'image';
      });
    });
    if (!hasImage) {
      return res.status(400).json({ error: { type: 'bad_request', message: 'image required' } });
    }

    // Server enforces model and token cap — client cannot override.
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
