// /api/contents.js
import { Client } from '@notionhq/client';

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const databaseId = process.env.NOTION_DATABASE_ID;

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const pages = await notion.databases.query({
        database_id: databaseId,
        sorts: [{ property: 'Created', direction: 'descending' }],
      });

      const items = pages.results.map(p => {
        const props = p.properties || {};
        const attachments = (props.Attachments?.files || []).map((f) => {
          const url = f?.external?.url || f?.file?.url || '';
          return { name: f.name || 'file', url };
        });

        return {
          id: p.id,
          title: props.Title?.title?.[0]?.plain_text || '',
          content: props.Content?.rich_text?.[0]?.plain_text || '',
          formattedContent: props.Formatted?.rich_text?.[0]?.plain_text || '',
          category: props.Category?.select?.name || 'General',
          tags: (props.Tags?.multi_select || []).map(t => t.name),
          dateCreated: props.Created?.date?.start || '',
          lastUsed: props.LastUsed?.date?.start || '',
          useCount: Number(props.UseCount?.number || 0),
          attachments,
        };
      });

      res.status(200).json({ items });
      return;
    }

    if (req.method === 'POST') {
      const body = req.body || {};
      const {
        title = '',
        content = '',
        formattedContent = '',
        category = 'General',
        tags = [],
        dateCreated = new Date().toISOString().slice(0, 10),
        useCount = 0,
        attachments = [], // [{ name, url }]
      } = body;

      const files = (attachments || [])
        .filter(a => a?.url)
        .map(a => ({
          name: a.name || 'attachment',
          external: { url: a.url },
        }));

      const page = await notion.pages.create({
        parent: { database_id: databaseId },
        properties: {
          Title: { title: [{ type: 'text', text: { content: title } }] },
          Content: { rich_text: [{ type: 'text', text: { content } }] },
          Formatted: { rich_text: [{ type: 'text', text: { content: formattedContent || content } }] },
          Category: { select: { name: category } },
          Tags: { multi_select: tags.map(t => ({ name: t })) },
          Created: { date: { start: dateCreated } },
          UseCount: { number: useCount },
          Attachments: files.length ? { files } : undefined,
        },
      });

      res.status(200).json({ ok: true, id: page.id });
      return;
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
}
