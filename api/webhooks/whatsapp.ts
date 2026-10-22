import type { IncomingMessage, ServerResponse } from 'http';
import crypto from 'crypto';

/**
 * Vercel Serverless Function Handler for WhatsApp Meta Webhook
 * Path: /api/webhooks/whatsapp
 *
 * Supports Node.js / Pages Router runtime on Vercel.
 */

// Helper to buffer request body for HMAC calculation
async function getRawBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
    });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

export const config = {
  api: {
    bodyParser: false, // Keep raw body for HMAC verification
  },
};

export default async function handler(req: any, res: any) {
  const method = req.method;

  // 1. GET: Handshake Verification from Meta
  if (method === 'GET') {
    const url = new URL(req.url, `https://${req.headers.host || 'localhost'}`);
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');

    const expectedToken =
      process.env.WHATSAPP_VERIFY_TOKEN ||
      process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN ||
      '';

    if (mode === 'subscribe' && expectedToken && token === expectedToken) {
      console.log('[Meta Webhook GET] Handshake verified successfully.');
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      return res.status(200).send(challenge || '');
    }

    console.warn('[Meta Webhook GET] Verification failed.');
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    return res.status(403).send('Forbidden');
  }

  // 2. POST: Inbound Messages & Events from Meta
  if (method === 'POST') {
    try {
      const rawBody = typeof req.body === 'string' ? req.body : await getRawBody(req);
      const appSecret = process.env.WHATSAPP_APP_SECRET;

      if (appSecret) {
        const signature = req.headers['x-hub-signature-256'];
        if (!signature || typeof signature !== 'string' || !signature.startsWith('sha256=')) {
          console.warn('[Meta Webhook POST] Invalid or missing signature.');
          res.setHeader('Content-Type', 'text/plain; charset=utf-8');
          return res.status(401).send('Unauthorized');
        }

        const expectedHash = crypto
          .createHmac('sha256', appSecret)
          .update(rawBody)
          .digest('hex');
        const expectedSignature = `sha256=${expectedHash}`;

        const sigBuf = Buffer.from(signature);
        const expBuf = Buffer.from(expectedSignature);

        if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
          console.warn('[Meta Webhook POST] Signature mismatch.');
          res.setHeader('Content-Type', 'text/plain; charset=utf-8');
          return res.status(403).send('Forbidden: Signature mismatch');
        }
      }

      // Validated. Meta expects 200 plain text response
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      return res.status(200).send('EVENT_RECEIVED');
    } catch (err: any) {
      console.error('[Meta Webhook POST] Error handling event');
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      return res.status(500).send('Internal Server Error');
    }
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).send('Method Not Allowed');
}
