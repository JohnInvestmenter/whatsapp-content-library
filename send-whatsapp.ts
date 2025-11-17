// /api/send-whatsapp.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";

const BASE_URL = process.env.WAHA_BASE_URL!;   // e.g. http://localhost:3000 or https://waha.yourdomain.com
const API_KEY  = process.env.WAHA_API_KEY!;    // from your WAHA .env

function toChatId(input: string) {
  const digits = String(input || "").replace(/\D/g, "");
  if (digits.length < 8) throw new Error("Invalid phone number");
  return `${digits}@c.us`; // intl number without "+", WA format
}

function getFileType(filename: string) {
  const ext = (filename || '').split('.').pop()?.toLowerCase() || '';
  if(['jpg','jpeg','png','gif','webp','bmp'].includes(ext)) return 'image';
  if(['mp4','webm','mov','avi','mkv'].includes(ext)) return 'video';
  return 'file';
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  try {
    const { to, text, fileUrl, fileName } = req.body || {};
    if (!to) return res.status(400).json({ error: "`to` is required" });

    const chatId = toChatId(to);

    // If sending a file
    if (fileUrl && fileName) {
      const fileType = getFileType(fileName);
      let endpoint = '/api/sendFile';
      let payload: any = {
        session: "default",
        chatId,
        file: { url: fileUrl },
        caption: fileName
      };

      // Use specific endpoints for images and videos
      if (fileType === 'image') {
        endpoint = '/api/sendImage';
      } else if (fileType === 'video') {
        endpoint = '/api/sendVideo';
      }

      const r = await fetch(`${BASE_URL}${endpoint}`, {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
          "X-Api-Key": API_KEY
        },
        body: JSON.stringify(payload)
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) return res.status(r.status).json({ error: "WAHA error", details: data });

      return res.status(200).json({ ok: true, result: data });
    }

    // If sending text only
    if (!text) return res.status(400).json({ error: "`text` is required" });

    const payload = { session: "default", chatId, text };

    const r = await fetch(`${BASE_URL}/api/sendText`, {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "X-Api-Key": API_KEY
      },
      body: JSON.stringify(payload)
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) return res.status(r.status).json({ error: "WAHA error", details: data });

    return res.status(200).json({ ok: true, result: data });
  } catch (e: any) {
    return res.status(500).json({ error: e.message || "Server error" });
  }
}
