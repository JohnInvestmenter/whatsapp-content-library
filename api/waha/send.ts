// /api/waha/send.ts  (Vercel Node serverless function)
import type { VercelRequest, VercelResponse } from '@vercel/node';

const WAHA_BASE   = process.env.WAHA_BASE!;   // e.g. "https://waha.example.com"
const WAHA_KEY    = process.env.WAHA_KEY!;    // plain key that matches the hash in WAHA_API_KEY
const WAHA_SESSION= process.env.WAHA_SESSION || 'default';

// Utility: build chatId from phone like +9715xxxxxxx or 9715xxxxxxx
const toChatId = (raw: string) => raw.replace(/\D/g,'') + '@c.us';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    // CORS preflight
    res.setHeader('Access-Control-Allow-Origin', process.env.ALLOW_ORIGIN || '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(204).end();
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOW_ORIGIN || '*');

  try {
    const { phone, text, attachments = [] } = req.body || {};
    if (!phone || !text) return res.status(400).json({ error: 'phone and text are required' });

    const chatId = toChatId(String(phone));

    // 1) send the text
    const textResp = await fetch(`${WAHA_BASE}/api/sendText`, {
      method: 'POST',
      headers: { 'Content-Type':'application/json', 'X-Api-Key': WAHA_KEY },
      body: JSON.stringify({ session: WAHA_SESSION, chatId, text }),
    });
    const textJson = await textResp.json().catch(() => ({}));
    if (!textResp.ok) throw new Error(textJson.message || textJson.error || 'sendText failed');

    // 2) send attachments (if any) as files with URLs
    for (const a of attachments as Array<{url:string, name?:string, mimeType?:string}>) {
      const fileBody = {
        session: WAHA_SESSION,
        chatId,
        file: { url: a.url, filename: a.name || undefined, mimetype: a.mimeType || undefined },
        caption: undefined,
      };
      const fileResp = await fetch(`${WAHA_BASE}/api/sendFile`, {
        method: 'POST',
        headers: { 'Content-Type':'application/json', 'X-Api-Key': WAHA_KEY },
        body: JSON.stringify(fileBody),
      });
      const fileJson = await fileResp.json().catch(() => ({}));
      if (!fileResp.ok) throw new Error(fileJson.message || fileJson.error || 'sendFile failed');
    }

    return res.status(200).json({ ok: true });
  } catch (err:any) {
    return res.status(500).json({ error: err.message || 'Unexpected error' });
  }
}
