// api/contents.js
import { Client } from '@notionhq/client';

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const dbId = process.env.NOTION_DATABASE_ID;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (req.method === 'GET') {
      const data = await notion.databases.query({ database_id: dbId });
      const items = data.results.map(p => {
        const props = p.properties;
        const get = (r) => r?.[0]?.plain_text || '';
        return {
          id: p.id,
          title: get(props.Title?.title),
          content: get(props.Content?.rich_text),
          formattedContent: get(props['Formatted Content']?.rich_text),
          category: props.Category?.select?.name || 'General',
          tags: (props.Tags?.multi_select || []).map(t => t.name),
          dateCreated: props['Date Created']?.date?.start || '',
          lastUsed: props['Last Used']?.date?.start || '',
          useCount: props['Use Count']?.number || 0,
          scheduled: props.Scheduled?.date?.start || ''
        };
      });
      return res.status(200).json({ items });
    }

    if (req.method === 'POST') {
      const body = await parse(req);
      const props = {
        Title: { title: [{ text: { content: body.title || '' } }] },
        Content: { rich_text: [{ text: { content: body.content || '' } }] },
        'Formatted Content': { rich_text: [{ text: { content: body.formattedContent || '' } }] },
        Category: { select: body.category ? { name: body.category } : null },
        Tags: { multi_select: (body.tags || []).map(name => ({ name })) },
        'Date Created': body.dateCreated ? { date: { start: body.dateCreated } } : undefined,
        'Last Used': body.lastUsed ? { date: { start: body.lastUsed } } : undefined,
        'Use Count': { number: Number(body.useCount || 0) },
        Scheduled: body.scheduled ? { date: { start: body.scheduled } } : undefined,
      };
      await notion.pages.create({ parent: { database_id: dbId }, properties: props });
      return res.status(201).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Server error' });
  }
}

function parse(req) {
  return new Promise((resolve, reject) => {
    let data=''; req.on('data', c=>data+=c);
    req.on('end', ()=>{ try{ resolve(JSON.parse(data||'{}')); }catch(e){ reject(e); }});
  });
}
