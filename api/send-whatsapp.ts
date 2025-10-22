// /api/send-whatsapp.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";

const BASE_URL = process.env.WAHA_BASE_URL!;   // e.g. http://localhost:3000 or https://waha.yourdomain.com
const API_KEY  = process.env.WAHA_API_KEY!;    // from your WAHA .env

function toChatId(input: string) {
  const digits = String(input || "").replace(/\D/g, "");
  if (digits.length < 8) throw new Error("Invalid phone number");
  return `${digits}@c.us`; // intl number without "+", WA format
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  try {
    const { to, text } = req.body || {};
    if (!to || !text) return res.status(400).json({ error: "`to` and `text` are required" });

    const chatId = toChatId(to);
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
