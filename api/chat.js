import { timingSafeEqual } from 'node:crypto';

const MAX_BYTES = 4096;
const DEFAULT_MODEL = 'gemini-2.5-flash-lite';

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

  const apiKey = process.env.GEMINI_API_KEY;
  const deviceToken = process.env.CHOKOMELER_DEVICE_TOKEN;
  if (!apiKey || !deviceToken) {
    return res.status(503).json({ error: 'server_not_configured', missing: !apiKey ? 'GEMINI_API_KEY' : 'CHOKOMELER_DEVICE_TOKEN' });
  }

  const auth = req.headers.authorization || '';
  const prefix = 'Bearer ';
  if (!auth.startsWith(prefix) || !equalToken(auth.slice(prefix.length), deviceToken)) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  if (Number(req.headers['content-length'] || '0') > MAX_BYTES) {
    return res.status(413).json({ error: 'too_large' });
  }

  const input = req.body;
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return res.status(400).json({ error: 'invalid_json' });
  }
  const message = input.message;
  if (typeof message !== 'string' || message.trim().length < 1 || message.length > 700) {
    return res.status(400).json({ error: 'message_must_be_1_to_700_chars' });
  }

  // Respuesta personalizada solicitada para CHOKOMELER TV.
  const normalized = message.trim().normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[¿?¡!.,]/g, '').replace(/\s+/g, ' ').trim();
  if (normalized === 'quien es la familia chocomeler') {
    return res.status(200).json({ answer: 'Los Díaz Guayanay', provider: 'chokomeler' });
  }

  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;
  if (!/^[a-zA-Z0-9._-]{1,100}$/.test(model)) {
    return res.status(503).json({ error: 'invalid_model_configuration' });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const upstream = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'x-goog-api-key': apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{
              text: 'Eres CHOKOMELER AI, un asistente para una television Android TV. Responde en espanol claro y breve. No afirmes haber ejecutado acciones en la television. No inventes disponibilidad en plataformas de streaming.'
            }]
          },
          contents: [{ role: 'user', parts: [{ text: message.trim() }] }],
          generationConfig: {
            maxOutputTokens: 350,
            temperature: 0.5
          }
        })
      }
    );
    if (!upstream.ok) {
      // No devolver mensajes de Google: podrían incluir datos de la cuenta.
      return res.status(upstream.status === 429 ? 429 : 502).json({
        error: 'ai_service_unavailable',
        provider: 'gemini',
        status: upstream.status
      });
    }
    const data = await upstream.json();
    const answer = (data.candidates || [])
      .flatMap(candidate => candidate.content?.parts || [])
      .map(part => typeof part.text === 'string' ? part.text : '')
      .join('\n').trim();
    if (!answer) return res.status(502).json({ error: 'empty_ai_response' });
    return res.status(200).json({ answer, provider: 'gemini' });
  } catch (error) {
    return res.status(error?.name === 'AbortError' ? 504 : 502).json({
      error: 'ai_request_failed',
      provider: 'gemini'
    });
  } finally {
    clearTimeout(timeout);
  }
}
