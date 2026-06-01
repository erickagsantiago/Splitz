export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return res.status(200).json({ content: [{ text: 'DEBUG: no api key' }] });
  }

  try {
    const body = { ...req.body, stream: false };
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();
    return res.status(200).json(data);
  } catch (e) {
    return res.status(200).json({ content: [{ text: 'DEBUG error: ' + e.message }] });
  }
}

export const config = {
  api: {
    bodyParser: { sizeLimit: '10mb' },
    responseLimit: false
  }
};
