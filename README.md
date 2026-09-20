# Komtan

Komtan is a Visual Studio Code extension for storing reusable prompts, snippets, commands, SQL queries, notes, references, and text templates in one local library.

Use it to organize AI prompts, code snippets, terminal commands, SQL queries, configuration examples, email drafts, commit messages, checklists, and other reusable text under category folders. You can favorite items, search them, copy them to the clipboard, or insert them directly into the active editor.

Project page: https://anbarli.github.io/komtan/

## Use Cases

- AI prompts: code review, refactor requests, test generation, documentation summaries
- Code snippets: React component skeletons, Express routes, Kotlin models, CSS utilities
- Terminal commands: Docker, Git, npm, Gradle, curl, deployment commands
- SQL and data queries: report queries, migration drafts, debug queries
- Config templates: `.env.example`, JSON settings, YAML blocks, CI fragments
- Message drafts: email, customer replies, PR descriptions, release notes
- Checklists: pre-release checklist, code review checklist, QA steps
- Notes and shortcuts: project notes, frequently used links, issue templates

## Features

- Content types: Prompt, Code Snippet, Text / Copy, Template, Command, Reference
- Smart category suggestions based on content type
- Global and workspace-scoped items
- Tags
- Preview panel
- Readable preview for Markdown-style fenced code blocks
- Multi-line content editor
- Add, edit, duplicate, and delete items
- Automatic category folders
- Rename and delete categories
- Favorites folder
- Empty-library quick start actions
- One-click clear action when search or filters return no results
- Search by title, category, tags, type, scope, and content
- Filters by type, scope, and tag
- Preview actions for copy, insert, and edit
- Bulk tag, category, scope, and delete operations
- Starter pack with sample items
- Sensitive-content warning before saving possible secrets
- Clipboard copy
- Insert into the active text editor
- Open content in a temporary document when no editor is active
- Template variables such as `{{project}}`, `{{name}}`, and `{{ticket}}`
- JSON import and export
- Local storage through VS Code `globalState` and `workspaceState`

## Global and Workspace Scope

When you create an item, you can choose its scope:

- Global: visible in every VS Code project.
- This Workspace: visible only in the current workspace/project.

Global items are useful for general prompts, common commands, and canned replies. Workspace items are useful for project-specific API notes, deployment commands, customer notes, SQL queries, and issue templates.

Komtan separates items under `Global` and `Workspace` root folders. Search scans both scopes together.

## Tags

Add comma-separated tags to items:

```text
php, wordpress, api, production
```

Tags work alongside categories. An item belongs to one category but can have multiple tags. Search scans titles, categories, scopes, types, tags, and content.

## Preview Panel

Preview long prompts, snippets, SQL, commands, or documentation templates before using them.

Command:

- `Komtan: Preview Item`

The preview panel shows:

- Title
- Scope
- Type
- Category
- Tags
- Content

From the preview panel, you can copy the item, insert it into the active editor, or open the edit screen.

Fenced code blocks are rendered in a more readable format:

````text
```js
console.log('Komtan');
```
````

## Filtering

Narrow down the library from the Komtan panel.

Available commands:

- `Komtan: Filter by Content Type`
- `Komtan: Filter by Global/Workspace Scope`
- `Komtan: Filter by Tag`
- `Komtan: Clear Filters`

Filters work together with search. For example, you can choose the `Workspace` scope and then filter by the `api` tag.

## Bulk Operations

Edit multiple items at once.

Available commands:

- `Komtan: Bulk Add Tags`
- `Komtan: Bulk Change Category`
- `Komtan: Bulk Change Scope`
- `Komtan: Bulk Delete`

Bulk operations use the current search and filter result as the selectable set. This lets you filter first and then update only the relevant items.

## Starter Pack

Install sample prompt, command, template, and reference items for first-time use.

Command:

- `Komtan: Install Starter Pack`

The starter pack includes a code review prompt, debug prompt, Git/NPM commands, an API request template, a bug report template, and short reference examples.

When the Komtan panel is empty, quick actions for creating the first item, installing the starter pack, and importing JSON appear directly in the panel.

## Sensitive Content Warning

Komtan warns before saving content that looks like an API key, token, password, private key, JWT, or connection string.

This check does not block saving. It asks for confirmation so you do not accidentally store sensitive values.

## Quick Commands

Use items from the Command Palette without opening the side panel.

Available commands:

- `Komtan: Quick Search and Copy`
- `Komtan: Quick Search and Insert`
- `Komtan: Pick Favorite and Copy`
- `Komtan: Open Recent Item`

These commands let you search items, fill template variables, copy content, or insert content into the active editor.

## Duplicate Items

Duplicate similar prompts, snippets, commands, or templates instead of writing them from scratch.

Command:

- `Komtan: Duplicate Item`

The duplicated item keeps the same type, scope, category, tags, and content. The favorite state starts disabled for the new item. If the title already exists, Komtan creates a unique title such as `Copy 2` or `Copy 3`.

## Demo Screenshots

Recommended screenshots for README or Marketplace:

- Komtan side panel with category folders
- New item/editor screen
- Preview panel
- Search and filter result
- VSIX installation step

When screenshots are ready, add them under a `media/` folder and reference them from this README.

## Import and Export

Back up the Komtan library as a JSON file or move it to another machine.

Available commands:

- `Komtan: Export Library`
- `Komtan: Import Library`

Import modes:

- Add to existing library
- Replace existing library

## Suggested Categories

Komtan suggests categories based on the selected content type. The category field remains free-form, so you can also type your own category name.

### Prompt

- General Prompt
- Coding Prompts
- Debug / Error Analysis
- Refactor
- SEO / Content
- Image Generation Prompts
- Data Analysis
- System / Role Prompts

### Code Snippet

- PHP
- JavaScript / TypeScript
- HTML / CSS
- SQL
- Python
- Bash / PowerShell
- Regex
- JSON / API
- VS Code / Config

### Text / Copy

- Canned Replies
- Description Copy
- Product Descriptions
- SEO Copy
- Social Media
- Email / Message
- Technical Explanations

### Template

- API Request
- SQL Query
- PHP Function
- HTML Component
- Prompt Template
- Documentation
- Bug Report
- Commit / PR
- Project Starter Template

### Command

- Git
- Composer
- NPM / PNPM
- Docker
- Linux
- Windows
- MySQL
- SSH
- VS Code

### Reference

- Regex Examples
- HTTP Status Codes
- SQL Functions
- Git Commands
- CSS References
- API Notes
- Charset / Encoding
- Cheat Sheet

## Template Variables

Use `{{variable}}` fields inside content. Komtan asks for these values when copying or inserting the item, then renders the final text.

Example:

```text
Hello {{name}},

Here are my review notes for {{ticket}} in the {{project}} project:

- ...
```

When this item is used, Komtan asks for `name`, `ticket`, and `project`.

## Testing

Open the project in VS Code and install dependencies:

```bash
npm install
```

Run the syntax check:

```bash
npm run compile
```

Run unit tests:

```bash
npm test
```

If PowerShell script execution blocks npm scripts, use:

```bash
npm.cmd run compile
```

To test the extension in development mode, press `F5` in VS Code. In the Extension Development Host window, open the Komtan panel from the Activity Bar.

## Create a VSIX Package

```bash
npm run pack
```

This creates:

```text
komtan-1.0.0.vsix
```

## Install from VSIX

In VS Code:

1. Open the Extensions panel.
2. Click the `...` menu in the top-right corner.
3. Select `Install from VSIX...`.
4. Select `komtan-1.0.0.vsix`.

## Marketplace Readiness

The manifest includes the main Marketplace fields:

- `repository`
- `bugs`
- `homepage`
- `galleryBanner`
- `icon`
- `license`
- `publisher`

The current extension identifier is:

```text
ganbarli.komtan
```

If your repository address changes, update `repository`, `bugs`, and `homepage` in `package.json` before publishing.

The CI workflow runs `npm run compile` and `npm test` on pushes and pull requests.

After installation, Komtan appears in the left Activity Bar.

## License

This project is released under the MIT License. See `LICENSE` for details.
