export const config = {
  maxDuration: 300,
  runtime: 'edge',
};

export default async function handler(req) {
  const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (req.method === 'OPTIONS') return new Response(null, { status: 200, headers: CORS });
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });

  try {
    const body = await req.json();

    const TEAM_PASSWORD = process.env.TEAM_PASSWORD || 'ABCapital2025';
    if (!body.password || body.password !== TEAM_PASSWORD) {
      return new Response(JSON.stringify({ error: { message: 'Invalid password' } }), {
        status: 401, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
    if (!ANTHROPIC_API_KEY) {
      return new Response(JSON.stringify({ error: { message: 'API key not configured' } }), {
        status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    const { password, ...anthropicPayload } = body;
    anthropicPayload.model = 'claude-sonnet-4-5';
    anthropicPayload.max_tokens = anthropicPayload.max_tokens || 32000;
    anthropicPayload.stream = true;

    const anthropicResp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(anthropicPayload),
    });

    if (!anthropicResp.ok) {
      const errData = await anthropicResp.json();
      return new Response(JSON.stringify({ error: errData.error || { message: 'Anthropic error' } }), {
        status: anthropicResp.status, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    // Stream back — server assembles fullText to avoid client corruption
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();

    const send = async (obj) => {
      await writer.write(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
    };

    (async () => {
      const reader = anthropicResp.body.getReader();
      const decoder = new TextDecoder();
      let fullText = '';
      let sseBuffer = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          sseBuffer += decoder.decode(value, { stream: true });
          const lines = sseBuffer.split('\n');
          sseBuffer = lines.pop();

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const data = line.slice(6).trim();
            if (!data || data === '[DONE]') continue;
            let parsed;
            try { parsed = JSON.parse(data); } catch(e) { continue; }

            if (parsed.type === 'content_block_delta' && parsed.delta?.type === 'text_delta') {
              const chunk = parsed.delta.text;
              fullText += chunk;
              await send({ type: 'progress', text: chunk, len: fullText.length });
            }
            if (parsed.type === 'message_stop') {
              await send({ type: 'done', fullText });
            }
          }
        }
        // safety net
        if (fullText) await send({ type: 'done', fullText });
      } catch (err) {
        await send({ error: { message: err.message || 'Stream error' } });
      } finally {
        await writer.close();
      }
    })();

    return new Response(readable, {
      status: 200,
      headers: {
        ...CORS,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: { message: err.message || 'Server error' } }), {
      status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
}
