# Content Library

A unified web-based content management system for organizing WhatsApp messages and GPT prompts. This application helps teams maintain consistency by providing easy access to pre-approved messaging templates and AI prompts that align with company standards.

## Overview

The Content Library integrates two specialized libraries in one application:

1. **WhatsApp Content Library** - Manage and send WhatsApp messages with formatting preview
2. **GPT Prompts Library** - Store and execute standardized AI prompts for consistent outputs

Both libraries use Notion as a backend database and share a common interface with tab-based navigation.

## Features

### Core Features (Both Libraries)
- **Unified Interface**: Switch between libraries with tab navigation
- **Category Management**: Organize content with customizable categories
- **Tag System**: Add multiple tags for better searchability
- **Search & Filter**: Find content by title, text, category, or tags
- **Usage Tracking**: Monitor how often content is used
- **Dark/Light Theme**: Toggle themes with persistent preference
- **Statistics Dashboard**: View total items, usage stats, and categories
- **Pagination**: Handle large content sets efficiently (24 items per page)

### WhatsApp Content Library
- **Rich Text Formatting**: Use WhatsApp markdown (`**bold**`, `_italic_`, `~strikethrough~`, `` `code` ``)
- **Live Preview**: See exactly how messages will appear in WhatsApp
- **Direct Send**: Send messages directly to WhatsApp contacts via WAHA integration
- **Copy to Clipboard**: Quick copy for manual sending
- **File Attachments**: Upload images, videos, PDFs, and documents via Google Drive

### GPT Prompts Library
- **System Role Support**: Define system-level instructions for prompts
- **Model Selection**: Tag prompts with recommended GPT models (GPT-4, GPT-4-Turbo, GPT-3.5)
- **Copy to Clipboard**: Easily copy prompts with system roles to use in ChatGPT or other AI tools
- **Standardization**: Ensure team uses company-approved prompts for consistency
- **Usage Tracking**: Monitor which prompts are used most frequently

## Tech Stack

### Frontend
- **HTML/CSS/JavaScript** - Single-page application
- **Tailwind CSS** - Utility-first CSS framework (via CDN)
- **Lucide Icons** - Icon library (via CDN)

### Backend
- **Vercel Serverless Functions** - API endpoints
- **Notion API** - Database backend (2 separate databases)
- **WAHA** - WhatsApp HTTP API for message sending
- **Google Apps Script** - File upload to Google Drive (WhatsApp only)

### Dependencies
- `@notionhq/client` - Official Notion JavaScript client
- `@vercel/node` - TypeScript types for Vercel (dev dependency)
- Node.js >= 18

## Project Structure

```
whatsapp-content-library-main/
├── index.html              # Main integrated frontend application
├── package.json            # Node.js dependencies
├── api/
│   ├── contents.js         # WhatsApp content CRUD operations
│   ├── prompts.js          # GPT prompts CRUD operations
│   └── send-whatsapp.ts    # WhatsApp message sending via WAHA
└── README.md              # This file
```

## Setup Instructions

### 1. Notion Databases Setup

Create **TWO separate** Notion databases:

#### A. WhatsApp Content Database

| Property Name | Property Type | Required | Description |
|--------------|---------------|----------|-------------|
| Title | Title | Yes | Content title |
| Content | Rich text | No | Raw content text |
| Formatted | Rich text | No | WhatsApp-formatted content |
| Category | Select | No | Content category |
| Tags | Multi-select | No | Content tags |
| Created | Date | No | Creation date |
| UseCount | Number | No | Usage counter |
| LastUsed | Date | No | Last used timestamp |
| Attachments | Files & media | No | File attachments |

**Categories**: General, Motivation, Tech Tips, Fun Facts, Announcements, Events, Educational

#### B. GPT Prompts Database

| Property Name | Property Type | Required | Description |
|--------------|---------------|----------|-------------|
| Title | Title | Yes | Prompt title |
| Prompt | Rich text | Yes | The main prompt text |
| SystemRole | Rich text | No | System-level instructions |
| Category | Select | No | Prompt category |
| Tags | Multi-select | No | Prompt tags |
| Model | Select | No | Preferred GPT model |
| Temperature | Number | No | Temperature setting (0-1) |
| Created | Date | No | Creation date |
| UseCount | Number | No | Usage counter |
| LastUsed | Date | No | Last used timestamp |

**Categories**: General, Sales, Marketing, Support, Technical, Creative, Analysis
**Models**: GPT-4, GPT-4-Turbo, GPT-3.5

**Important**: Invite your Notion integration to BOTH databases (Share → Invite).

### 2. Google Drive Setup (for WhatsApp file uploads)

1. Create a Google Apps Script for file uploads
2. Deploy as a web app with public access
3. Update the `DRIVE_APP_SCRIPT` constant in `index.html` (line 279)

### 3. WAHA Setup (for WhatsApp sending)

1. Set up a [WAHA](https://waha.devlike.pro/) instance (self-hosted or cloud)
2. Create a default session and link your WhatsApp account
3. Note your WAHA base URL and API key

### 4. Environment Variables

Configure these in Vercel → Settings → Environment Variables:

```env
# Notion Configuration
NOTION_API_KEY=secret_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
NOTION_DATABASE_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx    # WhatsApp content database
NOTION_PROMPTS_DB_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx  # GPT prompts database

# WAHA Configuration (for WhatsApp sending)
WAHA_BASE_URL=http://localhost:3000
WAHA_API_KEY=your-waha-api-key
```

### 5. Deployment

#### Deploy to Vercel

```bash
npm install
vercel deploy
```

Or connect your GitHub repository to Vercel for automatic deployments.

#### Local Development

```bash
# Install dependencies
npm install

# Run with Vercel CLI
vercel dev
```

Open `http://localhost:3000` in your browser.

### 6. Configuration

Update these constants in `index.html` if needed:

```javascript
// Lines 276-280
const WA_API = '/api/contents';
const GPT_API = '/api/prompts';
const DRIVE_APP_SCRIPT = 'https://script.google.com/macros/s/.../exec';
const waCategories = ['General','Motivation','Tech Tips','Fun Facts','Announcements','Events','Educational'];
const gptCategories = ['General','Sales','Marketing','Support','Technical','Creative','Analysis'];
```

## Usage

### WhatsApp Content Library

#### Adding Content

1. Click the "WhatsApp Content" tab
2. Click the "Add Content" button
3. Fill in title, category, content (use WhatsApp markdown)
4. Optionally add tags and file attachments
5. Preview the formatted message
6. Click "Save"

#### Editing Content

1. Click the "Edit" button on any content card
2. Modify fields as needed
3. Click "Save changes"

#### Sending via WhatsApp

1. Click the "Send" button on a content card
2. Enter the recipient's phone number (international format, digits only)
   - Example: `9715XXXXXXXX` for UAE
3. Review/edit the message
4. Click "Send"

#### Copying Content

1. Click the "Copy" button to copy content to clipboard
2. Paste into any application
3. Usage count increments automatically

### GPT Prompts Library

#### Adding a Prompt

1. Click the "GPT Prompts" tab
2. Click the "Add Prompt" button
3. Fill in:
   - Title: Descriptive name for the prompt
   - Category: Prompt category
   - Model: Preferred GPT model (GPT-4, GPT-4-Turbo, GPT-3.5)
   - System Role (optional): System-level instructions
   - Prompt: The main prompt text
   - Tags (optional): Comma-separated tags
4. Click "Save"

#### Editing a Prompt

1. Click the "Edit" button on any prompt card
2. Modify fields as needed
3. Click "Save changes"

#### Using a Prompt

1. Click the "Copy" button on a prompt card
2. The full prompt (including system role if present) is copied to clipboard
3. Paste into ChatGPT, Claude, or your preferred AI interface
4. Usage count increments automatically

## API Endpoints

### WhatsApp Content Endpoints

#### GET /api/contents
Retrieves all WhatsApp content items from Notion database.

**Response:**
```json
{
  "items": [
    {
      "id": "page-id",
      "title": "Content Title",
      "content": "Raw content",
      "formattedContent": "WhatsApp formatted content",
      "category": "General",
      "tags": ["tag1", "tag2"],
      "dateCreated": "2025-01-15",
      "lastUsed": "2025-01-15",
      "useCount": 5,
      "attachments": [
        { "name": "file.pdf", "url": "https://..." }
      ]
    }
  ]
}
```

#### POST /api/contents
Creates a new content item.

**Request Body:**
```json
{
  "title": "New Content",
  "content": "Content text",
  "formattedContent": "Formatted text",
  "category": "General",
  "tags": ["tag1", "tag2"],
  "dateCreated": "2025-01-15",
  "useCount": 0,
  "attachments": [
    { "name": "file.pdf", "url": "https://..." }
  ]
}
```

#### PUT /api/contents
Updates an existing content item.

**Request Body:** Same as POST with additional `id` field.

### GPT Prompts Endpoints

#### GET /api/prompts
Retrieves all GPT prompts from Notion database.

**Response:**
```json
{
  "items": [
    {
      "id": "page-id",
      "title": "Prompt Title",
      "prompt": "Prompt text",
      "systemRole": "System instructions",
      "category": "Sales",
      "tags": ["email", "cold-outreach"],
      "model": "GPT-4",
      "temperature": 0.7,
      "dateCreated": "2025-01-15",
      "lastUsed": "2025-01-15",
      "useCount": 10
    }
  ]
}
```

#### POST /api/prompts
Creates a new prompt.

**Request Body:**
```json
{
  "title": "Sales Email Generator",
  "prompt": "Write a cold email...",
  "systemRole": "You are a sales expert...",
  "category": "Sales",
  "tags": ["email", "cold-outreach"],
  "model": "GPT-4",
  "temperature": 0.7,
  "dateCreated": "2025-01-15",
  "useCount": 0
}
```

#### PUT /api/prompts
Updates an existing prompt.

**Request Body:** Same as POST with additional `id` field.

### Utility Endpoints

#### POST /api/send-whatsapp
Sends a WhatsApp message via WAHA.

**Request Body:**
```json
{
  "to": "9715XXXXXXXX",
  "text": "Message content"
}
```

## Use Cases

### WhatsApp Content Library
- **Customer Support**: Store standard responses to common questions
- **Marketing**: Maintain approved promotional messages
- **Internal Communications**: Share company announcements consistently
- **Onboarding**: Provide new team members with message templates

### GPT Prompts Library
- **Sales**: Standardize email generation, proposal writing
- **Marketing**: Consistent ad copy, social media content
- **Support**: Standard response templates with AI enhancement
- **Technical**: Code review prompts, documentation generation
- **Creative**: Brand-aligned content creation
- **Analysis**: Standard data analysis prompts

## WhatsApp Formatting

The application supports WhatsApp markdown:

- `**bold**` → **bold**
- `_italic_` → _italic_
- `~strikethrough~` → ~~strikethrough~~
- `` `code` `` → `code`

## Troubleshooting

### Notion API Errors

- **"Missing env vars"**: Set `NOTION_API_KEY`, `NOTION_DATABASE_ID`, and `NOTION_PROMPTS_DB_ID` in Vercel
- **"Integration not found"**: Invite your Notion integration to BOTH databases
- **Property errors**: Ensure property names match exactly (case-sensitive)

### WhatsApp Sending Errors

- **"WAHA error"**: Check WAHA instance is running and accessible
- **"Invalid phone number"**: Use international format without "+" (e.g., `9715XXXXXXXX`)
- **Session errors**: Ensure WhatsApp session is active in WAHA

### File Upload Errors

- **Upload fails**: Verify Google Apps Script URL and permissions
- **Rename fails**: File must have a valid `fileId` from Drive

## Best Practices

### WhatsApp Content
1. Use clear, descriptive titles
2. Preview messages before saving
3. Use categories consistently across team
4. Add relevant tags for easy searching
5. Keep messages concise and action-oriented

### GPT Prompts
1. Write specific, detailed prompts
2. Use system roles to set context and tone
3. Test prompts before sharing with team
4. Document expected outputs in prompt titles
5. Use appropriate models (GPT-4 for complex tasks, GPT-3.5 for simple ones)
6. Set temperature based on creativity needs (lower for factual, higher for creative)

## Security Notes

- **API Keys**: Never commit API keys to version control
- **Environment Variables**: Store all secrets in Vercel environment variables
- **Notion Permissions**: Limit integration permissions to specific databases
- **WAHA Access**: Secure WAHA instance with authentication

## License

This project is private and not licensed for public use.

## Support

For issues or feature requests, contact the development team.

## Credits

Created for InvestMenter to manage content library efficiently and ensure consistent communications and AI usage across the organization.
