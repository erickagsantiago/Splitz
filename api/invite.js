// Validates the biller invite code server-side so the secret is never shipped
// to the client bundle. Set INVITE_CODE in the Vercel project's environment
// variables; it falls back to the original code if unset so nothing breaks.
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false });

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (e) { body = {}; }
  }

  const submitted = ((body && body.code) || '').toString().trim().toUpperCase();
  const expected = (process.env.INVITE_CODE || 'EGS911').trim().toUpperCase();

  // Length check first, then a length-aware compare to avoid trivial leaks.
  let ok = submitted.length === expected.length && submitted.length > 0;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= (submitted.charCodeAt(i) || 0) ^ expected.charCodeAt(i);
  }
  ok = ok && diff === 0;

  return res.status(200).json({ ok });
}
