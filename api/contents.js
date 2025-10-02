// /api/contents.js
// Vercel Node function with robust error messages + Notion mapping

const { Client } = require('@notionhq/client');

function json(res, code, body) {
  res.statusCode = code;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

function readEnv() {
  const key = process.env.NOTION_API_KEY;
  const db  = process.env.NOTION_DATABASE_ID;
  if (!key || !db) {
    return { ok: false, code: 400, body: {
      error: 'Missing env vars',
      hint: 'Set NOTION_API_KEY and NOTION_DATABASE_ID in Vercel → Settings → Environment Variables, then redeploy.'
    }};
  }
  return { ok: true, key, db };
}

// property names expected in your DB (case sensitive)
const COL = {
  Title:      'Title',       // Title
  Content:    'Content',     // Rich text
  Formatted:  'Formatted',   // Rich text
  Category:   'Category',    // Select
  Tags:       'Tags',        // Multi-select
  Created:    'Created',     // Date
  UseCount:   'UseCount',    // Number
  LastUsed:   'LastUsed',    // Date (optional)
  Attachments:'Attachments', // Files & media OR URL
};

function notionToText(rich = []) {
  return rich.map(b => b.plain_text || '').join('');
}
function textToRich(text = '') {
  return [{ type: 'text', text: { content: text } }];
}

function mapPageToItem(page) {
  const p = page.properties || {};
  const get = (name) => p[name];

  const title = get(COL.Title)?.title?.[0]?.plain_text || '';
  const content = notionToText(get(COL.Content)?.rich_text || []);
  const formatted = notionToText(get(COL.Formatted)?.rich_text || []);
  const category = get(COL.Category)?.select?.name || 'General';
  const tags = (get(COL.Tags)?.multi_select || []).map(t => t.name);
  const created = get(COL.Created)?.date?.start || (page.created_time || '').slice(0,10);
  const useCount = Number(get(COL.UseCount)?.number || 0);
  const lastUsed = get(COL.LastUsed)?.date?.start || '';
  const attachmentsProp = get(COL.Attachments);

  const attachments = [];
  if (attachmentsProp?.type === 'files') {
    (attachmentsProp.files || []).forEach(f => {
      if (f.type === 'file')   attachments.push({ id: f.file?.expiry_time ? '' : '', name: f.name, url: f.file?.url });
      if (f.type === 'external') attachments.push({ id: '', name: f.name, url: f.external?.url });
    });
  } else if (attachmentsProp?.type === 'url' && attachmentsProp.url) {
    attachments.push({ id:'', name: attachmentsProp.url, url: attachmentsProp.url });
  }

  return {
    id: page.id,
    title,
    content,
    formattedContent: formatted,
    category,
    tags,
    dateCreated: (created || '').slice(0,10),
    useCount,
    lastUsed: lastUsed ? lastUsed.slice(0,10) : '',
    attachments
  };
}

function toWhatsApp(text='') {
  return text
    .replace(/\*\*(.*?)\*\*/g,'*$1*')
    .replace(/_(.*?)_/g,'_$1_')
    .replace(/~(.*?)~/g,'~$1~')
    .replace(/`(.*?)`/g,'$1');
}

// validate required columns exist (lightweight heuristic)
function validateColumns(props) {
  const names = Object.keys(props || {});
  const required = [COL.Title, COL.Content, COL.Formatted, COL.Category, COL.Tags, COL.Created, COL.UseCount];
  const missing = required.filter(n => !names.includes(n));
  return missing;
}

module.exports = async (req, res) => {
  try {
    const env = readEnv();
    if (!env.ok) return json(res, env.code, env.body);

    const notion = new Client({ auth: env.key });

    if (req.method === 'GET') {
      // fetch database metadata first to validate columns
      const meta = await notion.databases.retrieve({ database_id: env.db });
      const missing = validateColumns(meta.properties);
      if (missing.length) {
        return json(res, 400, {
          error: 'Server error',
          message: `Missing required Notion properties: ${missing.join(', ')}`,
          hint: 'Create these properties in your database (Title, Content, Formatted, Category, Tags, Created, UseCount).'
        });
      }

      // query pages; try sort on Created, else fall back to last edited
      let result;
      try {
        result = await notion.databases.query({
          database_id: env.db,
          sorts: [{ property: COL.Created, direction: 'descending' }]
        });
      } catch (e) {
        // If Created is not sortable yet (wrong type), fall back safely
        result = await notion.databases.query({
          database_id: env.db,
          sorts: [{ timestamp: 'last_edited_time', direction: 'descending' }]
        });
      }

      const items = (result.results || []).map(mapPageToItem);
      return json(res, 200, { items });
    }

    if (req.method === 'POST') {
      const body = JSON.parse(req.body || '{}');

      // Defaults + transform
      const title = String(body.title || '').trim();
      const content = String(body.content || '');
      const formatted = body.formattedContent ? String(body.formattedContent) : toWhatsApp(content);
      const category = body.category || 'General';
      const tags = Array.isArray(body.tags) ? body.tags : [];
      const dateCreated = body.dateCreated || new Date().toISOString().slice(0,10);
      const useCount = Number(body.useCount || 0);
      const attachments = Array.isArray(body.attachments) ? body.attachments : [];

      if (!title || !content) {
        return json(res, 400, { error: 'Validation error', message: 'title and content are required' });
      }

      // Build Notion page
      const properties = {};
      properties[COL.Title] = { title: [{ type:'text', text:{ content:title } }] };
      properties[COL.Content] = { rich_text: textToRich(content) };
      properties[COL.Formatted] = { rich_text: textToRich(formatted) };
      properties[COL.Category] = { select: { name: category } };
      properties[COL.Tags] = { multi_select: tags.map(t => ({ name:t })) };
      properties[COL.Created] = { date: { start: dateCreated } };
      properties[COL.UseCount] = { number: useCount };
      if (body.lastUsed) properties[COL.LastUsed] = { date: { start: body.lastUsed } };

      // For attachments, store as URL list in the URL property if you use URL,
      // or as files if the property is "files". Here we support URL property first:
      if (attachments.length && properties[COL.Attachments] === undefined) {
        // Try to set url to the first attachment when property type is URL
        // If your property is Files, switch to "files" below.
        // properties[COL.Attachments] = { url: attachments[0].url };
      }

      const created = await notion.pages.create({
        parent: { database_id: env.db },
        properties
      });

      return json(res, 200, { ok:true, id: created.id });
    }

    if (req.method === 'PUT') {
      const body = JSON.parse(req.body || '{}');
      const id = body.id;
      if (!id) return json(res, 400, { error: 'Validation error', message: 'id is required' });

      const properties = {};
      if (body.title !== undefined)     properties[COL.Title] = { title: [{ type:'text', text:{ content:String(body.title) } }] };
      if (body.content !== undefined)   properties[COL.Content] = { rich_text: textToRich(String(body.content)) };
      if (body.formattedContent !== undefined) properties[COL.Formatted] = { rich_text: textToRich(String(body.formattedContent)) };
      if (body.category !== undefined)  properties[COL.Category] = { select: { name: String(body.category) } };
      if (body.tags !== undefined)      properties[COL.Tags] = { multi_select: (body.tags||[]).map(t=>({ name:String(t) })) };
      if (body.useCount !== undefined)  properties[COL.UseCount] = { number: Number(body.useCount) };
      if (body.lastUsed !== undefined)  properties[COL.LastUsed] = body.lastUsed ? { date: { start: String(body.lastUsed) } } : { date: null };

      await notion.pages.update({ page_id: id, properties });
      return json(res, 200, { ok:true });
    }

    // Method not allowed
    res.setHeader('Allow', 'GET,POST,PUT');
    return json(res, 405, { error:'Method not allowed' });

  } catch (err) {
    // Catch-all with friendly hints
    return json(res, 500, {
      error: 'Server error',
      message: String(err && err.message ? err.message : err),
      hint: 'Check: (1) env vars, (2) Notion integration invited to the database (Share → Invite), (3) property names: Title, Content, Formatted, Category, Tags, Created, UseCount, LastUsed (optional), Attachments (optional).'
    });
  }
};
