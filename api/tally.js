export const config = {
  maxDuration: 300, // 5 minutes - Vercel Pro/Hobby allows this with streaming
  runtime: 'edge', // Edge runtime supports streaming natively, no timeout
};

export default async function handler(req) {
  // CORS preflight
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

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: { message: 'Method Not Allowed' } }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  try {
    const body = await req.json();

    const TEAM_PASSWORD = process.env.TEAM_PASSWORD || 'ABCapital2025';
    if (!body.password || body.password !== TEAM_PASSWORD) {
      return new Response(JSON.stringify({ error: { message: 'Invalid password' } }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
    if (!ANTHROPIC_API_KEY) {
      return new Response(JSON.stringify({ error: { message: 'API key not configured' } }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    const { password, ...anthropicPayload } = body;
    anthropicPayload.model = 'claude-sonnet-4-5';
    anthropicPayload.max_tokens = 8000;
    anthropicPayload.stream = true; // KEY: enable streaming

    // Call Anthropic with streaming
    const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(anthropicPayload),
    });

    if (!anthropicResponse.ok) {
      const errData = await anthropicResponse.json();
      return new Response(JSON.stringify({ error: errData.error || { message: 'Anthropic error' } }), {
        status: anthropicResponse.status,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    // Stream the response directly back to the client
    // This keeps the connection alive and prevents any timeout
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();

    // Process the SSE stream from Anthropic and collect text
    (async () => {
      const reader = anthropicResponse.body.getReader();
      const decoder = new TextDecoder();
      let fullText = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6).trim();
              if (data === '[DONE]') continue;
              try {
                const parsed = JSON.parse(data);
                // Extract text delta from streaming events
                if (parsed.type === 'content_block_delta' && parsed.delta?.type === 'text_delta') {
                  fullText += parsed.delta.text;
                  // Send progress ping to keep connection alive
                  await writer.write(encoder.encode(`data: ${JSON.stringify({ type: 'progress', text: parsed.delta.text })}\n\n`));
                }
                if (parsed.type === 'message_stop') {
                  // Send final complete response
                  await writer.write(encoder.encode(`data: ${JSON.stringify({ type: 'done', fullText })}\n\n`));
                }
              } catch (e) {
                // Skip malformed JSON lines
              }
            }
          }
        }
      } finally {
        await writer.close();
      }
    })();

    return new Response(readable, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: { message: err.message || 'Server error' } }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
}
