export const config = {
  maxDuration: 60, // 60 seconds — Vercel free tier max
};

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: { message: 'Method Not Allowed' } });
  }

  try {
    const body = req.body;

    // Password check
    const TEAM_PASSWORD = process.env.TEAM_PASSWORD || 'ABCapital2025';
    if (!body.password || body.password !== TEAM_PASSWORD) {
      return res.status(401).json({ error: { message: 'Invalid password' } });
    }

    const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
    if (!ANTHROPIC_API_KEY) {
      return res.status(500).json({ error: { message: 'API key not configured on server' } });
    }

    // Strip password, force correct model
    const { password, ...anthropicPayload } = body;
    anthropicPayload.model = 'claude-sonnet-4-5';
    if (!anthropicPayload.max_tokens) anthropicPayload.max_tokens = 8000;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(anthropicPayload),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: data.error || { message: 'Anthropic API error' } });
    }

    return res.status(200).json(data);

  } catch (err) {
    return res.status(500).json({ error: { message: err.message || 'Internal server error' } });
  }
}
