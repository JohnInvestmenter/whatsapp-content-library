// /api/prompts.js
import { Client } from "@notionhq/client";

/**
 * Handler for GPT Prompts Library
 *
 * Supported Notion properties (if they exist):
 *   Title (Title)
 *   Prompt (Rich text)
 *   SystemRole (Rich text)
 *   Category (Select)
 *   Tags (Multi-select)
 *   Created (Date)
 *   UseCount (Number)
 *   LastUsed (Date)
 *   Model (Select) - e.g., GPT-4, GPT-3.5
 *   Temperature (Number)
 */

export default async function handler(req, res) {
  const debug = String(req.query?.debug || "").toLowerCase() === "1";

  try {
    const NOTION_API_KEY = process.env.NOTION_API_KEY;
    const NOTION_PROMPTS_DB_ID = process.env.NOTION_PROMPTS_DB_ID;

    if (!NOTION_API_KEY || !NOTION_PROMPTS_DB_ID) {
      return res.status(500).json({
        error: "Missing env vars",
        hint: "Set NOTION_API_KEY and NOTION_PROMPTS_DB_ID in Vercel → Settings → Environment Variables"
      });
    }

    const notion = new Client({ auth: NOTION_API_KEY });

    // Fetch DB schema
    const db = await notion.databases.retrieve({ database_id: NOTION_PROMPTS_DB_ID });
    const DB_PROPS = db?.properties || {};

    // Helper functions
    const has = (name) => Boolean(DB_PROPS[name]);
    const getTitle = (props, name = "Title") => props?.[name]?.title?.[0]?.plain_text ?? "";
    const getRich = (props, name) => props?.[name]?.rich_text?.map(t => t?.plain_text || "")?.join("") || "";
    const getSelect = (props, name) => props?.[name]?.select?.name || "";
    const getMulti = (props, name) => (props?.[name]?.multi_select || []).map(t => t.name);
    const getDate = (props, name) => props?.[name]?.date?.start || "";
    const getNumber = (props, name) => {
      const n = props?.[name]?.number;
      return typeof n === "number" ? n : 0;
    };

    // Build query
    const query = { database_id: NOTION_PROMPTS_DB_ID };
    if (has("Created")) {
      query.sorts = [{ property: "Created", direction: "descending" }];
    }

    // GET - Retrieve all prompts
    if (req.method === "GET") {
      const pages = await notion.databases.query(query);

      const items = pages.results.map((p) => {
        const props = p.properties || {};

        return {
          id: p.id,
          title: has("Title") ? getTitle(props, "Title") : "",
          prompt: has("Prompt") ? getRich(props, "Prompt") : "",
          systemRole: has("SystemRole") ? getRich(props, "SystemRole") : "",
          category: has("Category") ? getSelect(props, "Category") : "General",
          tags: has("Tags") ? getMulti(props, "Tags") : [],
          dateCreated: has("Created") ? getDate(props, "Created") : "",
          lastUsed: has("LastUsed") ? getDate(props, "LastUsed") : "",
          useCount: has("UseCount") ? getNumber(props, "UseCount") : 0,
          model: has("Model") ? getSelect(props, "Model") : "GPT-4",
          temperature: has("Temperature") ? getNumber(props, "Temperature") : 0.7
        };
      });

      return res.status(200).json({ items });
    }

    // POST - Create new prompt
    if (req.method === "POST") {
      let body = req.body;
      if (typeof body === "string") {
        try { body = JSON.parse(body); } catch { body = {}; }
      }

      const {
        title = "",
        prompt = "",
        systemRole = "",
        category = "General",
        tags = [],
        dateCreated = new Date().toISOString().slice(0, 10),
        useCount = 0,
        model = "GPT-4",
        temperature = 0.7
      } = body || {};

      const properties = {};

      if (has("Title")) {
        properties.Title = { title: [{ type: "text", text: { content: title } }] };
      }
      if (has("Prompt") && prompt) {
        properties.Prompt = { rich_text: [{ type: "text", text: { content: prompt } }] };
      }
      if (has("SystemRole") && systemRole) {
        properties.SystemRole = { rich_text: [{ type: "text", text: { content: systemRole } }] };
      }
      if (has("Category") && category) {
        properties.Category = { select: { name: category } };
      }
      if (has("Tags") && Array.isArray(tags) && tags.length) {
        properties.Tags = { multi_select: tags.map((t) => ({ name: t })) };
      }
      if (has("Created") && dateCreated) {
        properties.Created = { date: { start: dateCreated } };
      }
      if (has("UseCount")) {
        properties.UseCount = { number: Number(useCount || 0) };
      }
      if (has("Model") && model) {
        properties.Model = { select: { name: model } };
      }
      if (has("Temperature")) {
        properties.Temperature = { number: Number(temperature) };
      }

      if (!has("Title")) {
        return res.status(400).json({
          error: "No 'Title' property in database. Create a Title column named exactly 'Title'."
        });
      }

      const page = await notion.pages.create({
        parent: { database_id: NOTION_PROMPTS_DB_ID },
        properties
      });

      return res.status(200).json({ ok: true, id: page.id });
    }

    // PUT - Update existing prompt
    if (req.method === "PUT") {
      let body = req.body;
      if (typeof body === "string") {
        try { body = JSON.parse(body); } catch { body = {}; }
      }

      const { id, title, prompt, systemRole, category, tags, model, temperature } = body || {};

      if (!id) {
        return res.status(400).json({ error: "Missing 'id' in request body" });
      }

      const properties = {};

      if (has("Title") && title !== undefined) {
        properties.Title = { title: [{ type: "text", text: { content: title } }] };
      }
      if (has("Prompt") && prompt !== undefined) {
        properties.Prompt = { rich_text: [{ type: "text", text: { content: prompt } }] };
      }
      if (has("SystemRole") && systemRole !== undefined) {
        properties.SystemRole = { rich_text: [{ type: "text", text: { content: systemRole } }] };
      }
      if (has("Category") && category) {
        properties.Category = { select: { name: category } };
      }
      if (has("Tags") && Array.isArray(tags)) {
        properties.Tags = { multi_select: tags.map((t) => ({ name: t })) };
      }
      if (has("Model") && model) {
        properties.Model = { select: { name: model } };
      }
      if (has("Temperature") && temperature !== undefined) {
        properties.Temperature = { number: Number(temperature) };
      }

      await notion.pages.update({
        page_id: id,
        properties
      });

      return res.status(200).json({ ok: true, id });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (e) {
    console.error("API /api/prompts error:", e);
    return res.status(500).json({
      error: "Server error",
      message: e?.message || String(e),
      debug: debug ? { name: e?.name, code: e?.code, status: e?.status, body: e?.body } : undefined,
      hint: "Make sure your Notion integration is invited to the prompts database"
    });
  }
}
