import { timingSafeEqual } from 'node:crypto';

const MAX_BYTES = 4096;
function equalToken(value, expected) {
  if (typeof value !== 'string' || !expected) return false;
  const a = Buffer.from(value, 'utf8');
  const b = Buffer.from(expected, 'utf8');
  return a.length === b.length && timingSafeEqual(a, b);
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Security-Policy', "default-src 'none'");
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method_not_allowed' });
  }
  const apiKey = process.env.OPENAI_API_KEY;
  const deviceToken = process.env.CHOKOMELER_DEVICE_TOKEN;
  if (!apiKey || !deviceToken) return res.status(503).json({ error: 'server_not_configured' });
  const auth = req.headers.authorization || '';
  const prefix = 'Bearer ';
  if (!auth.startsWith(prefix) || !equalToken(auth.slice(prefix.length), deviceToken)) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  if (Number(req.headers['content-length'] || '0') > MAX_BYTES) return res.status(413).json({ error: 'too_large' });
  const input = req.body;
  if (!input || typeof input !== 'object' || Array.isArray(input)) return res.status(400).json({ error: 'invalid_json' });
  const message = input.message;
  if (typeof message !== 'string' || message.trim().length < 1 || message.length > 700) {
    return res.status(400).json({ error: 'message_must_be_1_to_700_chars' });
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const upstream = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
        instructions: 'Eres CHOKOMELER AI, un asistente para una televisión Android TV. Responde en español claro y breve. No afirmes haber ejecutado acciones en la televisión. No inventes disponibilidad en plataformas de streaming.',
        input: message.trim(),
        max_output_tokens: 300,
        store: false
      })
    });
    if (!upstream.ok) {
      return res.status(502).json({ error: 'ai_service_unavailable', status: upstream.status });
    }
    const data = await upstream.json();
    const answer = (data.output || [])
      .flatMap(item => item.content || [])
      .filter(part => part.type === 'output_text')
      .map(part => part.text || '')
      .join('\n').trim();
    if (!answer) return res.status(502).json({ error: 'empty_ai_response' });
    return res.status(200).json({ answer });
  } catch (error) {
    return res.status(error?.name === 'AbortError' ? 504 : 502).json({ error: 'ai_request_failed' });
  } finally {
    clearTimeout(timeout);
  }
}
