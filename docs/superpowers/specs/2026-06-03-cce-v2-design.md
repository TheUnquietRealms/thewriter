# Coffee Curiosity Engine v2 — Design Spec

**Date:** 2026-06-03  
**Status:** Approved  
**Primary use cases:** Books, articles. All modes available by mood.  
**AI:** Gemini 1.5 Flash free tier, user-supplied key.

---

## Scope

Three sequential phases building on the existing React + Vite + localStorage stack. No backend. No user accounts. All data stays in localStorage.

---

## Phase 1 — Polish + Completeness

### 1.1 Branding

Navigator header gains a logo mark (coffee cup icon, orange gradient) + "Coffee Curiosity Engine" wordmark. No other layout changes.

### 1.2 Writing Modes

Add five modes to `src/lib/modes.ts` alongside existing nine:

| Mode key | Label | Ideal word range | Notes |
|---|---|---|---|
| `poem` | Poem | 10–200 | No subtitle expected. Banned: clichéd imagery. |
| `book-chapter` | Book Chapter | 1000–6000 | Subtitle = chapter subtitle. Fiction + narrative rules. |
| `research` | Research Paper | 2000–8000 | Subtitle expected. Evidence discipline heavy. Citations required. |
| `screenplay` | Screenplay | 500–4000 | Scene headings, dialogue. Banned: passive voice, adverbs. |
| `blog` | Blog Post | 400–1500 | Replaces medium/substack distinction in practice. |

Each mode gets: `bannedPhrases`, `editorialTip`, `reviewCategories`, `subtitleExpected`.

### 1.3 Score Ring

`ReviewPanel` overall score rendered as SVG arc ring (52×52px). Stroke colour: green ≥75, amber 50–74, red <50. Replaces the flat `review-overall-score` number. Score number stays centred inside ring.

### 1.4 Status Badge Colours

Navigator `nav-status` and editor `btn-status--active` share the same colour tokens already in CSS. No code change needed — CSS already handles draft/review/published colours. Audit to confirm both components use the same classes.

### 1.5 Tags

**Data:** Add `tags: string[]` to `Article` type. Default `[]`. Persisted to localStorage.

**UI:**
- Tag pills row in editor, above title. Click `+ tag` to add. Click pill `×` to remove.
- Navigator filter accepts tag: `#coffee` syntax routes to tag filter, plain text routes to title filter.
- Tags shown as small blue pills on nav-item.

**No tag management screen** — tags are created inline, deleted when removed from all articles.

### 1.6 Reading Time

`countWords(body) / 220` rounded up, minimum 1. Shown in toolbar-actions as "X min". Sits between word count and Copy MD button.

### 1.7 Outline Field

**Data:** Add `outline: string` to `Article` type. Default `""`.

**UI:** Collapsible section between toolbar and title field. Header "Outline / Notes" with toggle chevron. Collapsed by default if empty, expanded if populated. `<textarea>` with auto-resize. **Excluded** from word count and all exports. Included in full-text search.

---

## Phase 2 — Writing Tools

### 2.1 Markdown Preview

Toggle button in toolbar-actions: `Write` / `Preview`. When Preview active, textarea hidden, `<div class="md-preview">` shown with `marked(article.body)`. marked.js added as npm dependency. Preview is read-only.

### 2.2 Full-text Search

Navigator search already filters by title. Extend: if query ≥3 chars, also match `article.body` and `article.outline`. Show match count badge on result. Performance: client-side linear scan, adequate for <500 articles in localStorage.

### 2.3 Project Grouping

**Data:** Add `project: string` to `Article` type. Default `""` (ungrouped).

**UI:**
- Navigator groups articles under collapsible project headers when `project` is set.
- Ungrouped articles appear under "Uncategorised" at bottom.
- Project name editable inline (click to edit).
- New article inherits selected project.
- Enables book chapters: create project "My Novel", add chapters as articles with mode `book-chapter`.

### 2.4 Grammar Check (LanguageTool)

- Button "Check Grammar" in toolbar-actions. On click: POST body text to `https://api.languagetool.org/v2/check` (free, no key).
- Results shown in right panel as new tab "Grammar" (alongside Codex / Review).
- Each match: offset, message, replacements. User clicks replacement to apply.
- Rate limit: 20 req/min free tier. Disable button for 3s after use.

### 2.5 Focus Timer

- Timer button in toolbar-actions (⏱). Click starts 25-min countdown.
- Shown in editor footer: "23:14 remaining". Click to pause/resume. Double-click to reset.
- On completion: `Notification` API if permitted, else visual flash.
- Timer persists across article switches (global state in App).

### 2.6 Enhanced Export

Existing: Copy MD, Export MD.  
Add: **Export DOCX** via `docx` npm package. Generates: Title (Heading1), Subtitle (italic paragraph), body paragraphs split on `\n\n`. Opens as download. Outline field excluded.

---

## Phase 3 — Gemini AI Assistance

### 3.1 Settings Panel

Gear icon button in navigator footer. Opens `SettingsPanel` component replacing navigator content. Fields:
- Gemini API key (password input, stored in localStorage as `cce_gemini_key`)
- Link: "Get a free key at ai.google.dev"
- Key validated on save: test call to Gemini, show ✓ or error.
- Clear key button.

### 3.2 AI Context Object

Every AI call constructs:

```ts
interface AIContext {
  mode: WritingMode
  voiceRules: string        // codex.voiceRules (truncated 400 chars)
  bannedHabits: string      // codex.bannedHabits (truncated 200 chars)
  bodySample: string        // article.body first 500 chars
  title: string
}
```

System prompt: "You are a writing assistant. Respect these voice rules: {voiceRules}. Never use: {bannedHabits}. Writing mode: {mode}."

### 3.3 AI Features

All use `gemini-1.5-flash` model. All stream responses.

| Feature | Trigger | Behaviour |
|---|---|---|
| **Continue** | Button in toolbar | Appends streamed continuation after cursor (or end of body). Max 400 tokens. |
| **Rewrite** | Select text → button | Rewrites selection. Shows proposed text in overlay. Accept replaces selection, Reject discards. |
| **Suggest outline** | Button when body empty | Sends title + mode → returns markdown outline. Drops into `outline` field. |
| **Research** | Input field in AI panel | User types topic → Gemini summarises (300 words) in user's voice. Appends to body or outline. |
| **Brainstorm** | Button when stuck | "5 directions this {mode} could go". Returns bullet list, appended below cursor. |

### 3.4 AI Panel

New right-panel tab "AI" (alongside Codex / Review / Grammar). Visible only if API key is set. Contains: feature buttons, topic input for Research, streaming output display, Accept/Reject controls.

### 3.5 Rate Limiting + Errors

- Gemini free tier: 15 RPM. Disable AI buttons for 4s after each call.
- On 429: show "Rate limit hit — wait a moment."
- On 401: show "Invalid API key — check Settings."
- No retries. User retries manually.

---

## Data Model Changes

```ts
// additions to Article in src/types.ts
tags: string[]       // Phase 1
outline: string      // Phase 1
project: string      // Phase 2
```

Storage key unchanged (`cce_articles`). `loadArticles()` maps missing fields to defaults — backwards compatible.

---

## Architecture Notes

- All phases: zero backend, zero auth, zero hosting cost change.
- Grammar check: only external call with no key (LanguageTool).
- Gemini calls: direct from browser to `generativelanguage.googleapis.com`. CORS allowed by Google.
- No new build infrastructure. Vite + React stays.
- New npm deps: `marked` (Phase 2), `docx` (Phase 2). Both MIT.

---

## Out of Scope

- User accounts / sync
- EPUB export (complex, low priority)
- Auto-save to cloud
- Collaboration
- Mobile layout (responsive exists, not optimised)
- AI image generation
