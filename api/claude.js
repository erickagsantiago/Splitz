export const config = {
  api: {
    bodyParser: {
      sizeLimit: '15mb'
    }
  },
  maxDuration: 60
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  console.log('API key exists:', !!process.env.ANTHROPIC_API_KEY);
  console.log('Body size:', JSON.stringify(req.body).length);

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('No API key');
    return res.status(500).json({ error: 'API key not configured' });
  }

  try {
    const body = { ...req.body, stream: false };
    console.log('Calling Anthropic...');

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(body)
    });

    console.log('Anthropic status:', response.status);
    const data = await response.json();
    console.log('Response type:', data.type, 'error:', data.error);
    return res.status(200).json(data);
  } catch (e) {
    console.error('Error:', e.message);
    return res.status(500).json({ error: e.message });
  }
}
