# Coffee & Curiosity Writing Engine

A private long-form writing studio for essays, Substack drafts, book notes, and public reasoning.

**Live:** https://coffee-curiosity-engine.pages.dev/

## Stack

- Vite + React + TypeScript
- Plain CSS (dark/light mode)
- localStorage (no backend, no auth, no database)
- Cloudflare Pages (deployment)

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Features

### Writing
- Three-column layout: Navigator / Editor / Right panel
- 14 writing modes: Essay, Fiction, Technical, Journal, Email, LinkedIn, Medium, Substack, GitHub Docs, Poem, Book Chapter, Research Paper, Screenplay, Blog Post
- Title, subtitle, body, outline (collapsible), status fields
- Tags — inline tag editor, tag filter (`#tagname` syntax in search)
- Project grouping — group articles under collapsible project headers
- Full-text search across title, body, and outline

### Editor tools
- Markdown preview toggle (Write / Preview)
- Word count + reading time
- Focus mode
- 25-min Pomodoro timer with browser notification
- Dark / light mode toggle

### Export
- Copy Markdown
- Export Markdown (.md)
- Export Word (.docx)

### Editorial
- Deterministic editorial review with SVG score ring (green/amber/red)
- Mode-specific review categories
- LanguageTool grammar check with one-click apply

### AI Assist
- Multiple providers: Gemini, OpenAI, OpenRouter, Anthropic (Claude)
- User-supplied API key (stored in localStorage; never sent anywhere except the chosen provider)
- Selectable model per provider
- Continue writing
- Suggest outline
- Brainstorm directions
- Research topic

### Codex
- Voice rules, banned AI habits, recurring themes, source notes, publication checklist

## Release history

- **0.3.0** — Multi-provider AI assist (Gemini, OpenAI, OpenRouter, Anthropic) with selectable models
- **0.2.1** — v2 complete: AI assist, grammar check, project grouping, focus timer, DOCX export, markdown preview, 5 new modes, tags, outline, score ring, branding
- **0.1** — Private writing engine scaffold

---
© 2026 ZenCloud Global Consultants. All rights reserved. Proprietary and confidential.
