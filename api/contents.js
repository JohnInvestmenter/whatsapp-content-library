// /api/contents.js
import { Client } from "@notionhq/client";

export default async function handler(req, res) {
  // ---- Safe debug flag (never exposes secrets) ----
  const debug = String(req.query?.debug || "").toLowerCase() === "1";

  try {
    // ---- Check env vars ----
    const NOTION_API_KEY = process.env.NOTION_API_KEY;
    const NOTION_DATABASE_ID = process.env.NOTION_DATABASE_ID;

    if (!NOTION_API_KEY || !NOTION_DATABASE_ID) {
      return res.status(500).json({
        error: "Missing env vars",
        hint:
          "Set NOTION_API_KEY and NOTION_DATABASE_ID in Vercel → Project → Settings → Environment Variables, then redeploy.",
        debug: debug
          ? {
              has_API_KEY: !!NOTION_API_KEY,
              has_DATABASE_ID: !!NOTION_DATABASE_ID
            }
          : undefined
      });
    }

    // ---- Notion client ----
    const notion = new Client({ auth: NOTION_API_KEY });

    if (req.method === "GET") {
      // Optional: if your DB has no "Created" property, drop the sorts array
      let query = { database_id: NOTION_DATABASE_ID };
      try {
        query.sorts = [{ property: "Created", direction: "descending" }];
      } catch (_) {}

      const pages = await notion.databases.query(query);

      const items = pages.results.map((p) => {
        const props = p.properties || {};
        const attachments = (props.Attachments?.files || []).map((f) => {
          const url = f?.external?.url || f?.file?.url || "";
          return { name: f.name || "file", url };
        });

        return {
          id: p.id,
          title: props.Title?.title?.[0]?.plain_text || "",
          content: props.Content?.rich_text?.[0]?.plain_text || "",
          formattedContent: props.Formatted?.rich_text?.[0]?.plain_text || "",
          category: props.Category?.select?.name || "General",
          tags: (props.Tags?.multi_select || []).map((t) => t.name),
          dateCreated: props.Created?.date?.start || "",
          lastUsed: props.LastUsed?.date?.start || "",
          useCount: Number(props.UseCount?.number ?? 0),
          attachments
        };
      });

      return res.status(200).json({ items });
    }

    if (req.method === "POST") {
      let body = req.body;
      if (typeof body === "string") {
        try {
          body = JSON.parse(body);
        } catch {
          body = {};
        }
      }

      const {
        title = "",
        content = "",
        formattedContent = "",
        category = "General",
        tags = [],
        dateCreated = new Date().toISOString().slice(0, 10),
        useCount = 0,
        attachments = []
      } = body || {};

      const props = {
        Title: { title: [{ type: "text", text: { content: title } }] },
        UseCount: { number: Number(useCount || 0) }
      };
      if (content)
        props.Content = { rich_text: [{ type: "text", text: { content } }] };
      if (formattedContent)
        props.Formatted = {
          rich_text: [{ type: "text", text: { content: formattedContent } }]
        };
      if (category) props.Category = { select: { name: category } };
      if (Array.isArray(tags) && tags.length)
        props.Tags = { multi_select: tags.map((t) => ({ name: t })) };
      if (dateCreated) props.Created = { date: { start: dateCreated } };

      const files = (attachments || [])
        .filter((a) => a?.url)
        .map((a) => ({
          name: a.name || "attachment",
          external: { url: a.url }
        }));
      if (files.length) props.Attachments = { files };

      const page = await notion.pages.create({
        parent: { database_id: NOTION_DATABASE_ID },
        properties: props
      });

      return res.status(200).json({ ok: true, id: page.id });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (e) {
    // Log full error to Vercel logs, but return safe details in response
    console.error("API /api/contents error:", e);

    return res.status(500).json({
      error: "Server error",
      message: e?.message || String(e),
      // expose minimal hints only when ?debug=1
      debug:
        debug
          ? {
              name: e?.name,
              code: e?.code,
              status: e?.status,
              body: e?.body
            }
          : undefined,
      hint:
        "Check: (1) env vars, (2) Notion integration invited to the database (Share → Invite), (3) property names: Title, Content, Formatted, Category, Tags, Created, UseCount, LastUsed (optional), Attachments."
    });
  }
}
