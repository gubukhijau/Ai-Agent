import crypto from 'crypto';

/**
 * Next.js App Router Webhook Handler for Meta WhatsApp Cloud API
 * Path: /api/webhooks/whatsapp
 *
 * Fully compatible with Next.js 13+, 14+, 15+ App Router and Vercel Serverless/Edge.
 */

// Force dynamic execution so Vercel doesn't pre-render or cache GET/POST requests
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET Handler - Meta Webhook Handshake Verification
 * Meta WhatsApp Cloud API calls this when you configure your Callback URL in Meta Developers Portal.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('hub.mode');
    const token = searchParams.get('hub.verify_token');
    const challenge = searchParams.get('hub.challenge');

    // Verification token set in environment variables
    const expectedToken =
      process.env.WHATSAPP_VERIFY_TOKEN ||
      process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN ||
      '';

    // Must be hub.mode === 'subscribe' and token must match expectedToken
    if (mode === 'subscribe' && expectedToken && token === expectedToken) {
      console.log('[Meta Webhook GET] Handshake verified successfully.');
      // MUST return challenge as direct plain text with HTTP 200 (NOT JSON)
      return new Response(challenge || '', {
        status: 200,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      });
    }

    console.warn('[Meta Webhook GET] Verification failed: mode or token mismatch.');
    return new Response('Verification failed: Forbidden', {
      status: 403,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  } catch (err: any) {
    console.error('[Meta Webhook GET] Error processing verification handshake');
    return new Response('Internal Server Error', { status: 500 });
  }
}

/**
 * POST Handler - Inbound WhatsApp Events & Customer Messages
 * Receives webhook notifications from Meta WhatsApp Cloud API.
 */
export async function POST(request: Request) {
  try {
    const rawBody = await request.text();

    // 1. Validate X-Hub-Signature-256 if WHATSAPP_APP_SECRET is set
    const appSecret = process.env.WHATSAPP_APP_SECRET;
    if (appSecret) {
      const signatureHeader = request.headers.get('x-hub-signature-256');
      if (!signatureHeader || !signatureHeader.startsWith('sha256=')) {
        console.warn('[Meta Webhook POST] Missing or invalid X-Hub-Signature-256 header.');
        return new Response('Unauthorized: Signature missing or invalid format', {
          status: 401,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        });
      }

      const expectedHash = crypto
        .createHmac('sha256', appSecret)
        .update(rawBody)
        .digest('hex');
      const expectedSignature = `sha256=${expectedHash}`;

      const headerBuf = Buffer.from(signatureHeader);
      const expectedBuf = Buffer.from(expectedSignature);

      if (
        headerBuf.length !== expectedBuf.length ||
        !crypto.timingSafeEqual(headerBuf, expectedBuf)
      ) {
        console.warn('[Meta Webhook POST] Signature mismatch.');
        return new Response('Forbidden: Signature mismatch', {
          status: 403,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        });
      }
    }

    // Parse JSON payload
    let payload: any = {};
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return new Response('Bad Request: Invalid JSON', { status: 400 });
    }

    // Meta WhatsApp Cloud API requires returning HTTP 200 within 3 seconds
    // Optional Supabase logging if configured
    if (process.env.SUPABASE_URL && (process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)) {
      try {
        const { insertChatLogToSupabase } = await import('@/src/lib/supabase');
        const entry = payload?.entry?.[0];
        const changes = entry?.changes?.[0]?.value;
        const messages = changes?.messages;
        const contacts = changes?.contacts;

        if (messages && Array.isArray(messages) && messages.length > 0) {
          const message = messages[0];
          if (message.type === 'text') {
            await insertChatLogToSupabase({
              from_phone: message.from,
              from_name: contacts?.[0]?.profile?.name || 'Pelanggan WhatsApp',
              user_message: message.text?.body || '',
              agent_reply: '(Inbound WhatsApp Webhook received)',
              agent_source: 'meta_webhook',
              order_detected: false,
            });
          }
        }
      } catch (dbErr) {
        // Do not fail webhook response if database logging fails
        console.error('[Meta Webhook POST] Failed to log to Supabase:', dbErr);
      }
    }

    return new Response('EVENT_RECEIVED', {
      status: 200,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  } catch (err: any) {
    console.error('[Meta Webhook POST] Internal error processing webhook');
    return new Response('Internal Server Error', { status: 500 });
  }
}
