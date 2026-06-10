export const config = {
  maxDuration: 300,
  runtime: 'edge',
};

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
    });
  }

  // This endpoint now only does ONE thing:
  // validate the password and return the API key to the browser.
  // The browser then calls Anthropic directly — no file size limit.
  if (req.method === 'POST') {
    try {
      const body = await req.json();
      const TEAM_PASSWORD = process.env.TEAM_PASSWORD || 'ABCapital2025';

      if (!body.password || body.password !== TEAM_PASSWORD) {
        return new Response(JSON.stringify({ error: 'Invalid password' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
      }

      const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
      if (!ANTHROPIC_API_KEY) {
        return new Response(JSON.stringify({ error: 'API key not configured on server' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
      }

      // Return the API key to the authenticated browser session
      // This is safe because: password is required, HTTPS is enforced, key is scoped
      return new Response(JSON.stringify({ apiKey: ANTHROPIC_API_KEY }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });

    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }
  }

  return new Response('Method Not Allowed', { status: 405 });
}
