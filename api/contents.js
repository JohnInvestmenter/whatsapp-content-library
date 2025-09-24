// api/contents.js
import { Client } from '@notionhq/client';

const NOTION_API_KEY = process.env.NOTION_API_KEY;
const NOTION_DATABASE_ID = process.env.NOTION_DATABASE_ID;

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  // Fast checks for the most common cause
  if (!NOTION_API_KEY || !NOTION_DATABASE_ID) {
    return res.status(500).json({
      error: "Missing env vars",
      hint: "Set NOTION_API_KEY and NOTION_DATABASE_ID in Vercel → Settings → Environment Variables, then redeploy."
    });
  }

  const notion = new Client({ auth: NOTION_API_KEY });

  try {
    if (req.method === 'GET') {
      const data = await notion.databases.query({ database_id: NOTION_DATABASE_ID });
      const items = data.results.map((p) => {
        const props = p.properties;
        const text = (rt) => (rt?.[0]?.plain_text ?? '').trim();
        return {
          id: p.id,
          title: text(props.Title?.title),
          content: text(props.Content?.rich_text),
          formattedContent: text(props['Formatted Content']?.rich_text),
          category: props.Category?.select?.name || 'General',
          tags: (props.Tags?.multi_select || []).map((t) => t.name),
          dateCreated: props['Date Created']?.date?.start || '',
          lastUsed: props['Last Used']?.date?.start || '',
          useCount: props['Use Count']?.number ?? 0,
          scheduled: props.Scheduled?.date?.start || ''
        };
      });
      return res.status(200).json({ items });
    }

    if (req.method === 'POST') {
      const body = await readJson(req);
      const properties = {
        Title: { title: [{ text: { content: body.title || '' } }] },
        Content: { rich_text: [{ text: { content: body.content || '' } }] },
        'Formatted Content': { rich_text: [{ text: { content: body.formattedContent || '' } }] },
        Category: body.category ? { select: { name: body.category } } : undefined,
        Tags: { multi_select: (body.tags || []).map((name) => ({ name })) },
        'Date Created': body.dateCreated ? { date: { start: body.dateCreated } } : undefined,
        'Last Used': body.lastUsed ? { date: { start: body.lastUsed } } : undefined,
        'Use Count': { number: Number(body.useCount || 0) },
        Scheduled: body.scheduled ? { date: { start: body.scheduled } } : undefined
      };
      await notion.pages.create({
        parent: { database_id: NOTION_DATABASE_ID },
        properties
      });
      return res.status(201).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    // Show the real cause to the browser so you can fix quickly
    return res.status(500).json({
      error: 'Server error',
      message: err?.message || String(err)
    });
  }
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (c) => (data += c));
    req.on('end', () => {
      try { resolve(JSON.parse(data || '{}')); } catch (e) { reject(e); }
    });
  });
}
