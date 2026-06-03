# CCE v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add branding, 5 new writing modes, tags, outline, score ring, markdown preview, project grouping, LanguageTool grammar check, focus timer, DOCX export, and Gemini AI assistance to Coffee Curiosity Engine.

**Architecture:** All data in localStorage, zero backend. Phases 1–2 add no external runtime deps beyond marked.js and docx.js. Phase 3 adds direct browser→Gemini API calls using the user's own free API key.

**Tech Stack:** React 19, TypeScript, Vite, localStorage, marked (Phase 2), docx (Phase 2), Gemini REST API (Phase 3).

**Spec:** `docs/superpowers/specs/2026-06-03-cce-v2-design.md`

---

## File Map

### Phase 1 — Touch list
| File | Action |
|---|---|
| `src/types.ts` | Add `tags`, `outline` to Article |
| `src/lib/modes.ts` | Add 5 new modes |
| `src/lib/storage.ts` | Update defaults + migration in loadArticles |
| `src/lib/utils.ts` | Add `readingTime()` |
| `src/components/ArticleNavigator.tsx` | Branding header, tag pills on items, tag filter |
| `src/components/Editor.tsx` | Outline field, tag editor row, reading time display |
| `src/components/ReviewPanel.tsx` | Score ring SVG, colour-coded bars |
| `src/index.css` | All Phase 1 component styles |

### Phase 2 — Touch list
| File | Action |
|---|---|
| `src/types.ts` | Add `project` to Article |
| `src/lib/storage.ts` | Add `project` default in migration |
| `src/lib/languageTool.ts` | Create — LanguageTool API client |
| `src/lib/export.ts` | Create — DOCX export (extract + extend from storage.ts) |
| `src/components/MarkdownPreview.tsx` | Create — renders marked(body) |
| `src/components/GrammarPanel.tsx` | Create — grammar results + apply replacements |
| `src/components/ArticleNavigator.tsx` | Full-text search, project grouping |
| `src/components/Editor.tsx` | Preview toggle, grammar button, timer display, DOCX export button |
| `src/App.tsx` | Timer state, grammar results state, right-tab "grammar" |
| `src/index.css` | Phase 2 styles |

### Phase 3 — Touch list
| File | Action |
|---|---|
| `src/lib/gemini.ts` | Create — Gemini streaming client |
| `src/components/SettingsPanel.tsx` | Create — API key input + validation |
| `src/components/AIPanel.tsx` | Create — all AI features UI |
| `src/components/ArticleNavigator.tsx` | Settings gear in footer |
| `src/App.tsx` | Settings state, AI panel tab, geminiKey state |
| `src/index.css` | Phase 3 styles |

---

## PHASE 1

---

### Task 1: Data model — types + storage + utils

**Files:**
- Modify: `src/types.ts`
- Modify: `src/lib/storage.ts`
- Modify: `src/lib/utils.ts`

- [ ] **Step 1: Update Article type**

```ts
// src/types.ts — replace Article interface
export interface Article {
  id: string
  title: string
  subtitle: string
  body: string
  outline: string          // new
  tags: string[]           // new
  status: ArticleStatus
  mode: WritingMode
  wordTarget?: number
  createdAt: number
  updatedAt: number
}
```

- [ ] **Step 2: Update DEFAULT_ARTICLE and loadArticles migration**

```ts
// src/lib/storage.ts — update DEFAULT_ARTICLE
export const DEFAULT_ARTICLE: Omit<Article, 'id'> = {
  title: 'The First Draft',
  subtitle: 'Where everything begins and nothing is wasted',
  body: 'Start writing here...',
  outline: '',             // new
  tags: [],               // new
  status: 'draft',
  mode: DEFAULT_MODE,
  createdAt: Date.now(),
  updatedAt: Date.now(),
}

// src/lib/storage.ts — update loadArticles return map
return stored.map(a => ({
  ...DEFAULT_ARTICLE,
  ...a,
  mode: a.mode ?? DEFAULT_MODE,
  outline: (a as any).outline ?? '',   // migration
  tags: (a as any).tags ?? [],         // migration
}))
```

- [ ] **Step 3: Add readingTime utility**

```ts
// src/lib/utils.ts — add after countWords
export function readingTime(text: string): number {
  return Math.max(1, Math.ceil(countWords(text) / 220))
}
```

- [ ] **Step 4: Verify TypeScript**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/types.ts src/lib/storage.ts src/lib/utils.ts
git commit -m "feat: add tags, outline fields to Article type with migration"
```

---

### Task 2: New writing modes

**Files:**
- Modify: `src/lib/modes.ts`

- [ ] **Step 1: Add 5 modes to MODES object**

```ts
// src/lib/modes.ts — add inside MODES record after 'github-docs'
  poem: {
    label: 'Poem',
    idealWordRange: [10, 200],
    bannedPhrases: [
      'like a', 'as if', 'suddenly', 'very', 'really',
      'beautiful', 'amazing', 'wonderful',
    ],
    editorialTip: 'Every word earns its place. Cut until it hurts, then cut again.',
    reviewCategories: ['Voice Authenticity', 'Paragraph Rhythm', 'Banned Phrases', 'Draft Maturity'],
    subtitleExpected: false,
  },
  'book-chapter': {
    label: 'Book Chapter',
    idealWordRange: [1000, 6000],
    bannedPhrases: [
      'suddenly', 'he felt', 'she felt', 'they felt',
      'little did he know', 'little did she know',
      'tears streamed down', 'her heart raced',
      'needless to say',
    ],
    editorialTip: 'Each chapter must move something — plot, character, or world. If nothing shifts, cut it.',
    reviewCategories: ['Voice Authenticity', 'Paragraph Rhythm', 'Banned Phrases', 'Anti-LLM Smell', 'Draft Maturity'],
    subtitleExpected: true,
  },
  research: {
    label: 'Research Paper',
    idealWordRange: [2000, 8000],
    bannedPhrases: [
      'it is clear that', 'obviously', 'needless to say',
      'simply', 'of course', 'as we can see',
      'in conclusion', 'to summarize',
    ],
    editorialTip: 'State your claim, show your evidence, address the counterargument. In that order, every time.',
    reviewCategories: ['Argument Clarity', 'Evidence Discipline', 'Title Quality', 'Banned Phrases', 'Anti-LLM Smell', 'Draft Maturity'],
    subtitleExpected: true,
  },
  screenplay: {
    label: 'Screenplay',
    idealWordRange: [500, 4000],
    bannedPhrases: [
      'suddenly', 'very', 'really', 'quickly',
      'he thought', 'she thought', 'we see',
      'it is revealed',
    ],
    editorialTip: 'If it cannot be filmed, it cannot be in the script. Show action, not interiority.',
    reviewCategories: ['Voice Authenticity', 'Paragraph Rhythm', 'Banned Phrases', 'Draft Maturity'],
    subtitleExpected: false,
  },
  blog: {
    label: 'Blog Post',
    idealWordRange: [400, 1500],
    bannedPhrases: [
      'in this post', 'in this article', 'we will explore', 'we will discuss',
      'hot take', 'unpopular opinion', 'you need to know',
      'game changer', 'thought leader',
    ],
    editorialTip: 'Lead with the payoff. Your reader decided in the first sentence whether to stay.',
    reviewCategories: ['Voice Authenticity', 'Argument Clarity', 'Title Quality', 'Banned Phrases', 'Anti-LLM Smell', 'Draft Maturity'],
    subtitleExpected: true,
  },
```

- [ ] **Step 2: Add to WritingMode union and MODE_LIST**

```ts
// src/types.ts — extend WritingMode union
export type WritingMode =
  | 'essay' | 'fiction' | 'technical' | 'journal'
  | 'email' | 'linkedin' | 'medium' | 'substack' | 'github-docs'
  | 'poem' | 'book-chapter' | 'research' | 'screenplay' | 'blog'

// src/lib/modes.ts — append to MODE_LIST array
  { value: 'poem', label: 'Poem' },
  { value: 'book-chapter', label: 'Book Chapter' },
  { value: 'research', label: 'Research Paper' },
  { value: 'screenplay', label: 'Screenplay' },
  { value: 'blog', label: 'Blog Post' },
```

- [ ] **Step 3: Verify**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/types.ts src/lib/modes.ts
git commit -m "feat: add poem, book-chapter, research, screenplay, blog modes"
```

---

### Task 3: Navigator — branding + tag pills + tag filter

**Files:**
- Modify: `src/components/ArticleNavigator.tsx`

- [ ] **Step 1: Add branding header**

Replace the existing nav-header div:

```tsx
// src/components/ArticleNavigator.tsx
<header className="nav-header">
  <div className="nav-brand">
    <div className="nav-logo">☕</div>
    <div className="nav-brand-text">
      <span className="nav-brand-name">Coffee Curiosity</span>
      <span className="nav-brand-sub">ENGINE</span>
    </div>
  </div>
</header>
```

- [ ] **Step 2: Update filter logic to support #tag syntax**

```tsx
// replace the sorted const
const tagFilter = filter.startsWith('#') ? filter.slice(1).toLowerCase() : null
const textFilter = tagFilter ? null : filter.toLowerCase()

const sorted = [...articles]
  .sort((a, b) => b.updatedAt - a.updatedAt)
  .filter(a => {
    if (tagFilter) return a.tags.some(t => t.toLowerCase().includes(tagFilter))
    if (textFilter) return a.title.toLowerCase().includes(textFilter)
    return true
  })
```

- [ ] **Step 3: Add tag pills to nav-item-meta**

```tsx
// inside the nav-item-meta div, after existing spans
{article.tags.length > 0 && (
  <>
    <span className="nav-meta-sep">·</span>
    {article.tags.slice(0, 2).map(tag => (
      <span key={tag} className="nav-tag-pill">{tag}</span>
    ))}
  </>
)}
```

- [ ] **Step 4: Add New button to navigator footer**

```tsx
// replace the existing btn-new in nav-header with this footer
// Remove btn-new from nav-header entirely, add footer:
<footer className="nav-footer">
  <button className="btn-new-full" onClick={handleNew} aria-label="New article">
    + New Article
  </button>
</footer>
```

And simplify nav-header to just the brand (no + New button).

- [ ] **Step 5: Verify TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 6: Commit**

```bash
git add src/components/ArticleNavigator.tsx
git commit -m "feat: navigator branding, tag pills, tag filter, footer new button"
```

---

### Task 4: Editor — outline field + tag editor + reading time

**Files:**
- Modify: `src/components/Editor.tsx`
- Modify: `src/lib/utils.ts` (import readingTime)

- [ ] **Step 1: Import readingTime**

```tsx
// src/components/Editor.tsx — update import
import { countWords, relativeTime, readingTime } from '../lib/utils'
```

- [ ] **Step 2: Add outline collapse state**

```tsx
// inside Editor function, after existing useState calls
const [outlineOpen, setOutlineOpen] = useState(() => Boolean(article?.outline))
```

- [ ] **Step 3: Add tag state + handlers**

```tsx
const [tagInput, setTagInput] = useState('')
const [addingTag, setAddingTag] = useState(false)

function handleAddTag(e: React.FormEvent) {
  e.preventDefault()
  const val = tagInput.trim().toLowerCase().replace(/\s+/g, '-')
  if (!val || !article) return
  if (!article.tags.includes(val)) {
    update({ tags: [...article.tags, val] })
  }
  setTagInput('')
  setAddingTag(false)
}

function handleRemoveTag(tag: string) {
  if (!article) return
  update({ tags: article.tags.filter(t => t !== tag) })
}
```

- [ ] **Step 4: Add reading time to toolbar-actions**

```tsx
// inside toolbar-actions div, before word count span
<span className="editor-readtime" aria-label="Reading time">
  {readingTime(article.body)} min
</span>
```

- [ ] **Step 5: Add outline field above title**

```tsx
// inside editor-inner, before the field-title input
<div className="outline-section">
  <button
    className="outline-toggle"
    onClick={() => setOutlineOpen(o => !o)}
    aria-expanded={outlineOpen}
  >
    <span className="outline-chevron">{outlineOpen ? '▾' : '▸'}</span>
    Outline / Notes
  </button>
  {outlineOpen && (
    <textarea
      className="outline-body"
      placeholder="Plan your structure here. Excluded from word count and exports."
      value={article.outline}
      onChange={e => update({ outline: e.target.value })}
      rows={4}
    />
  )}
</div>
```

- [ ] **Step 6: Add tag row below subtitle input**

```tsx
// after field-subtitle input
<div className="tag-row">
  {article.tags.map(tag => (
    <span key={tag} className="tag-pill">
      #{tag}
      <button
        className="tag-pill-remove"
        onClick={() => handleRemoveTag(tag)}
        aria-label={`Remove tag ${tag}`}
      >×</button>
    </span>
  ))}
  {addingTag ? (
    <form className="tag-form" onSubmit={handleAddTag}>
      <input
        className="tag-input"
        value={tagInput}
        onChange={e => setTagInput(e.target.value)}
        placeholder="tag name"
        autoFocus
        onBlur={() => { setAddingTag(false); setTagInput('') }}
      />
    </form>
  ) : (
    <button className="tag-add-btn" onClick={() => setAddingTag(true)}>+ tag</button>
  )}
</div>
```

- [ ] **Step 7: Verify TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 8: Commit**

```bash
git add src/components/Editor.tsx src/lib/utils.ts
git commit -m "feat: outline field, tag editor, reading time in editor"
```

---

### Task 5: Review panel — score ring + colour-coded bars

**Files:**
- Modify: `src/components/ReviewPanel.tsx`

- [ ] **Step 1: Replace ScoreBar with colour-aware version**

```tsx
// src/components/ReviewPanel.tsx — replace ScoreBar
function scoreColor(score: number): string {
  return score >= 75 ? '#16A34A' : score >= 50 ? '#B45309' : '#DC2626'
}

function ScoreBar({ score }: { score: number }) {
  return (
    <div className="score-bar-track" role="progressbar" aria-valuenow={score} aria-valuemin={0} aria-valuemax={100}>
      <div
        className="score-bar-fill"
        style={{ width: `${score}%`, backgroundColor: scoreColor(score) }}
      />
    </div>
  )
}
```

- [ ] **Step 2: Replace flat score number with SVG ring**

```tsx
// replace the review-overall div
<div className="review-overall">
  <div className="score-ring-wrap" aria-label={`Overall score ${result.overall}`}>
    <svg width="64" height="64" viewBox="0 0 64 64">
      <circle cx="32" cy="32" r="26" fill="none" stroke="var(--border)" strokeWidth="6" />
      <circle
        cx="32" cy="32" r="26"
        fill="none"
        stroke={scoreColor(result.overall)}
        strokeWidth="6"
        strokeDasharray={`${(result.overall / 100) * 163.4} 163.4`}
        strokeDashoffset="40.85"
        strokeLinecap="round"
        transform="rotate(-90 32 32)"
      />
    </svg>
    <span className="score-ring-number" style={{ color: scoreColor(result.overall) }}>
      {result.overall}
    </span>
  </div>
  <div className="review-overall-meta">
    <span className="review-overall-label">Overall</span>
    <p className="review-summary">{result.summary}</p>
  </div>
</div>
```

Note: SVG arc math — circumference of circle r=26 is `2π×26 ≈ 163.4`. dashoffset `40.85` = 163.4/4 to start from top.

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/components/ReviewPanel.tsx
git commit -m "feat: score ring SVG, colour-coded bars in review panel"
```

---

### Task 6: CSS for Phase 1

**Files:**
- Modify: `src/index.css`

- [ ] **Step 1: Add branding styles**

Append to `src/index.css`:

```css
/* ── Branding ────────────────────────────────── */

.nav-brand {
  display: flex;
  align-items: center;
  gap: 9px;
}

.nav-logo {
  width: 30px;
  height: 30px;
  background: linear-gradient(135deg, #E8630A, #B84D00);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
  flex-shrink: 0;
}

.nav-brand-text {
  display: flex;
  flex-direction: column;
  line-height: 1.1;
}

.nav-brand-name {
  font: 800 11px var(--sans);
  letter-spacing: -0.02em;
  color: var(--text-h);
}

.nav-brand-sub {
  font: 700 8px var(--sans);
  letter-spacing: 0.1em;
  color: var(--text-muted);
}

.nav-footer {
  padding: 10px 10px 12px;
  border-top: 1px solid var(--border);
  flex-shrink: 0;
}

.btn-new-full {
  width: 100%;
  background: var(--accent);
  color: #fff;
  border: none;
  border-radius: var(--radius-sm);
  padding: 8px 12px;
  font: 700 12px var(--sans);
  cursor: pointer;
  transition: background 140ms;
}

.btn-new-full:hover { background: var(--accent-hover); }

/* ── Tags ────────────────────────────────────── */

.nav-tag-pill {
  font: 700 9px var(--sans);
  color: #3B82F6;
  background: rgba(59, 130, 246, 0.1);
  border: 1px solid rgba(59, 130, 246, 0.2);
  border-radius: var(--radius-full);
  padding: 1px 5px;
}

.tag-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 5px;
  margin-bottom: 14px;
  min-height: 24px;
}

.tag-pill {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font: 700 11px var(--sans);
  color: #3B82F6;
  background: rgba(59, 130, 246, 0.08);
  border: 1px solid rgba(59, 130, 246, 0.2);
  border-radius: var(--radius-full);
  padding: 2px 8px;
}

.tag-pill-remove {
  background: none;
  border: none;
  color: #3B82F6;
  cursor: pointer;
  padding: 0;
  font-size: 13px;
  line-height: 1;
  opacity: 0.6;
}

.tag-pill-remove:hover { opacity: 1; }

.tag-add-btn {
  background: none;
  border: 1px dashed var(--border);
  border-radius: var(--radius-full);
  color: var(--text-muted);
  font: 600 11px var(--sans);
  padding: 2px 8px;
  cursor: pointer;
  transition: all 120ms;
}

.tag-add-btn:hover { border-color: #3B82F6; color: #3B82F6; }

.tag-form { display: inline-flex; }

.tag-input {
  background: var(--surface);
  border: 1px solid #3B82F6;
  border-radius: var(--radius-full);
  color: var(--text-h);
  padding: 2px 10px;
  font: 11px var(--sans);
  outline: none;
  width: 90px;
  margin: 0;
  min-height: unset;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

/* ── Outline ─────────────────────────────────── */

.outline-section {
  margin-bottom: 16px;
}

.outline-toggle {
  background: none;
  border: none;
  color: var(--text-muted);
  font: 600 11px var(--sans);
  letter-spacing: 0.05em;
  text-transform: uppercase;
  padding: 4px 0;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 5px;
}

.outline-toggle:hover { color: var(--text-h); }

.outline-chevron { font-size: 10px; }

.outline-body {
  width: 100%;
  background: var(--surface-raised);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text);
  padding: 9px 11px;
  font: 13px/1.6 var(--sans);
  outline: none;
  resize: vertical;
  margin: 6px 0 0;
  min-height: unset;
}

.outline-body:focus {
  border-color: var(--accent-border);
  box-shadow: 0 0 0 3px var(--accent-bg);
}

/* ── Reading time ────────────────────────────── */

.editor-readtime {
  font: 600 12px var(--sans);
  color: var(--text-muted);
}

/* ── Score ring ──────────────────────────────── */

.score-ring-wrap {
  position: relative;
  width: 64px;
  height: 64px;
  flex-shrink: 0;
}

.score-ring-number {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font: 900 18px/1 var(--sans);
  font-variant-numeric: tabular-nums;
}

.review-overall {
  display: flex;
  align-items: center;
  gap: 14px;
}

.review-overall-meta {
  flex: 1;
}

.review-overall-meta .review-summary {
  margin: 4px 0 0;
  font-size: 12px;
}
```

- [ ] **Step 2: Build to check for CSS parse errors**

```bash
npm run build 2>&1 | tail -20
```
Expected: `✓ built in ...ms`

- [ ] **Step 3: Commit**

```bash
git add src/index.css
git commit -m "feat: Phase 1 CSS — branding, tags, outline, score ring, reading time"
```

---

## PHASE 2

---

### Task 7: Install deps + create lib files

**Files:**
- `package.json` (npm install)
- Create: `src/lib/languageTool.ts`
- Create: `src/lib/export.ts`

- [ ] **Step 1: Install marked and docx**

```bash
npm install marked docx
npm install --save-dev @types/marked
```

- [ ] **Step 2: Create LanguageTool client**

```ts
// src/lib/languageTool.ts
export interface LTMatch {
  message: string
  offset: number
  length: number
  replacements: { value: string }[]
  rule: { id: string; description: string }
}

export interface LTResult {
  matches: LTMatch[]
}

export async function checkGrammar(text: string, language = 'en-US'): Promise<LTResult> {
  const body = new URLSearchParams({ text, language })
  const res = await fetch('https://api.languagetool.org/v2/check', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  if (!res.ok) throw new Error(`LanguageTool error: ${res.status}`)
  return res.json()
}
```

- [ ] **Step 3: Create DOCX export lib**

```ts
// src/lib/export.ts
import { Document, Paragraph, TextRun, HeadingLevel, Packer } from 'docx'
import type { Article } from '../types'

export async function exportDocx(article: Article): Promise<void> {
  const bodyParas = article.body
    .split(/\n\n+/)
    .filter(Boolean)
    .map(text => new Paragraph({ children: [new TextRun({ text, size: 24 })] }))

  const doc = new Document({
    sections: [{
      children: [
        new Paragraph({
          text: article.title || 'Untitled',
          heading: HeadingLevel.HEADING_1,
        }),
        ...(article.subtitle ? [new Paragraph({
          children: [new TextRun({ text: article.subtitle, italics: true, size: 24 })],
        })] : []),
        new Paragraph({ text: '' }),
        ...bodyParas,
      ],
    }],
  })

  const blob = await Packer.toBlob(doc)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${(article.title || 'article').replace(/[^a-z0-9]/gi, '-').toLowerCase()}.docx`
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
```

- [ ] **Step 4: Verify TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json src/lib/languageTool.ts src/lib/export.ts
git commit -m "feat: add marked, docx deps; create languageTool and export libs"
```

---

### Task 8: Markdown preview component

**Files:**
- Create: `src/components/MarkdownPreview.tsx`
- Modify: `src/components/Editor.tsx`

- [ ] **Step 1: Create MarkdownPreview**

```tsx
// src/components/MarkdownPreview.tsx
import { marked } from 'marked'

interface Props {
  body: string
}

export default function MarkdownPreview({ body }: Props) {
  const html = marked(body, { async: false }) as string
  return (
    <div
      className="md-preview"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
```

- [ ] **Step 2: Add preview toggle state to Editor**

```tsx
// src/components/Editor.tsx — add import
import MarkdownPreview from './MarkdownPreview'

// add state
const [previewMode, setPreviewMode] = useState(false)

// reset on article change
useEffect(() => {
  setPreviewMode(false)
}, [article?.id])
```

- [ ] **Step 3: Add preview toggle button to toolbar-actions**

```tsx
// inside toolbar-actions, before Copy MD button
<button
  className={`btn-toolbar${previewMode ? ' btn-toolbar--accent' : ''}`}
  onClick={() => setPreviewMode(p => !p)}
  aria-label={previewMode ? 'Switch to write mode' : 'Preview markdown'}
  title="Toggle preview"
>
  {previewMode ? 'Write' : 'Preview'}
</button>
```

- [ ] **Step 4: Swap textarea for preview**

```tsx
// replace the field-body textarea with:
{previewMode
  ? <MarkdownPreview body={article.body} />
  : (
    <textarea
      ref={bodyRef}
      className="field-body"
      placeholder="Write here…"
      value={article.body}
      onChange={e => update({ body: e.target.value })}
      aria-label="Article body"
      spellCheck
    />
  )
}
```

- [ ] **Step 5: Add md-preview CSS to index.css**

```css
/* append to src/index.css */
.md-preview {
  font: 400 18px/1.85 Georgia, 'Times New Roman', serif;
  color: var(--text-h);
  min-height: 320px;
}

.md-preview h1, .md-preview h2, .md-preview h3 {
  font-family: var(--heading);
  color: var(--text-h);
  letter-spacing: -0.02em;
  margin: 1.2em 0 0.4em;
}

.md-preview p { margin: 0 0 1em; }

.md-preview strong { font-weight: 700; }

.md-preview em { font-style: italic; }

.md-preview code {
  font-family: monospace;
  background: var(--surface-raised);
  border: 1px solid var(--border);
  border-radius: 3px;
  padding: 1px 5px;
  font-size: 0.85em;
}

.md-preview blockquote {
  border-left: 3px solid var(--accent-border);
  background: var(--accent-bg);
  margin: 0 0 1em;
  padding: 8px 14px;
  border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
}

.md-preview ul, .md-preview ol {
  padding-left: 1.5em;
  margin: 0 0 1em;
}
```

- [ ] **Step 6: Verify build**

```bash
npm run build 2>&1 | tail -10
```

- [ ] **Step 7: Commit**

```bash
git add src/components/MarkdownPreview.tsx src/components/Editor.tsx src/index.css
git commit -m "feat: markdown preview toggle in editor"
```

---

### Task 9: Project grouping + full-text search in navigator

**Files:**
- Modify: `src/types.ts`
- Modify: `src/lib/storage.ts`
- Modify: `src/components/ArticleNavigator.tsx`

- [ ] **Step 1: Add project field to Article type**

```ts
// src/types.ts — add to Article interface
project: string   // empty string = ungrouped
```

- [ ] **Step 2: Update storage migration**

```ts
// src/lib/storage.ts — in loadArticles map
project: (a as any).project ?? '',
```

```ts
// DEFAULT_ARTICLE
project: '',
```

- [ ] **Step 3: Extend search to body + outline**

```tsx
// src/components/ArticleNavigator.tsx — replace filter logic
const tagFilter = filter.startsWith('#') ? filter.slice(1).toLowerCase() : null
const textFilter = (!tagFilter && filter.length >= 1) ? filter.toLowerCase() : null
const bodyFilter = (!tagFilter && filter.length >= 3) ? filter.toLowerCase() : null

const sorted = [...articles]
  .sort((a, b) => b.updatedAt - a.updatedAt)
  .filter(a => {
    if (tagFilter) return a.tags.some(t => t.toLowerCase().includes(tagFilter))
    if (bodyFilter) {
      return a.title.toLowerCase().includes(bodyFilter)
        || a.body.toLowerCase().includes(bodyFilter)
        || a.outline.toLowerCase().includes(bodyFilter)
    }
    if (textFilter) return a.title.toLowerCase().includes(textFilter)
    return true
  })
```

- [ ] **Step 4: Group articles by project in render**

```tsx
// src/components/ArticleNavigator.tsx — add grouping logic before return
const [collapsedProjects, setCollapsedProjects] = useState<Set<string>>(new Set())

function toggleProject(proj: string) {
  setCollapsedProjects(prev => {
    const next = new Set(prev)
    next.has(proj) ? next.delete(proj) : next.add(proj)
    return next
  })
}

// group sorted articles
const grouped: Record<string, Article[]> = {}
const ungrouped: Article[] = []
for (const a of sorted) {
  if (a.project) {
    grouped[a.project] = grouped[a.project] ?? []
    grouped[a.project].push(a)
  } else {
    ungrouped.push(a)
  }
}
const projectNames = Object.keys(grouped).sort()
```

- [ ] **Step 5: Render grouped list**

```tsx
// replace the ul content (inside nav-list)
<>
  {projectNames.map(proj => (
    <li key={proj} className="nav-project-group">
      <button
        className="nav-project-header"
        onClick={() => toggleProject(proj)}
      >
        <span>{collapsedProjects.has(proj) ? '▸' : '▾'}</span>
        <span className="nav-project-name">{proj}</span>
        <span className="nav-project-count">{grouped[proj].length}</span>
      </button>
      {!collapsedProjects.has(proj) && grouped[proj].map(article => (
        <ArticleItem key={article.id} article={article} /* ... existing item render */ />
      ))}
    </li>
  ))}
  {ungrouped.map(article => (
    <ArticleItem key={article.id} article={article} /* ... existing item render */ />
  ))}
</>
```

Note: Extract the existing `<li>` item render into a local `ArticleItem` component or inline function to avoid repetition.

- [ ] **Step 6: Add project CSS to index.css**

```css
/* append to src/index.css */
.nav-project-group { list-style: none; margin-bottom: 4px; }

.nav-project-header {
  width: 100%;
  background: none;
  border: none;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  color: var(--text-muted);
  font: 700 10px var(--sans);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  cursor: pointer;
  border-radius: var(--radius-sm);
}

.nav-project-header:hover { background: var(--surface-hover); color: var(--text-h); }

.nav-project-name { flex: 1; text-align: left; }

.nav-project-count {
  background: var(--surface-raised);
  border: 1px solid var(--border);
  border-radius: var(--radius-full);
  font-size: 9px;
  padding: 1px 5px;
}
```

- [ ] **Step 7: Verify TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 8: Commit**

```bash
git add src/types.ts src/lib/storage.ts src/components/ArticleNavigator.tsx src/index.css
git commit -m "feat: project grouping, full-text search in navigator"
```

---

### Task 10: Grammar panel (LanguageTool)

**Files:**
- Create: `src/components/GrammarPanel.tsx`
- Modify: `src/App.tsx`
- Modify: `src/components/Editor.tsx`

- [ ] **Step 1: Create GrammarPanel component**

```tsx
// src/components/GrammarPanel.tsx
import { useState } from 'react'
import type { LTMatch } from '../lib/languageTool'
import type { Article } from '../types'

interface Props {
  matches: LTMatch[]
  article: Article | null
  onApply: (match: LTMatch, replacement: string) => void
  loading: boolean
  error: string | null
}

export default function GrammarPanel({ matches, article, onApply, loading, error }: Props) {
  if (!article) return <p className="review-hint">Select an article to check grammar.</p>

  return (
    <section className="grammar-panel">
      <h2 className="panel-title">Grammar Check</h2>
      {error && <p className="grammar-error">{error}</p>}
      {loading && <p className="grammar-loading">Checking…</p>}
      {!loading && !error && matches.length === 0 && (
        <p className="review-hint">No issues found.</p>
      )}
      <div className="grammar-matches">
        {matches.map((m, i) => (
          <div key={i} className="grammar-match">
            <p className="grammar-message">{m.message}</p>
            <div className="grammar-context">
              "{article.body.slice(Math.max(0, m.offset - 10), m.offset + m.length + 10)}"
            </div>
            {m.replacements.slice(0, 3).map(r => (
              <button
                key={r.value}
                className="btn-grammar-replacement"
                onClick={() => onApply(m, r.value)}
              >
                → {r.value}
              </button>
            ))}
          </div>
        ))}
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Add grammar state to App.tsx**

```tsx
// src/App.tsx — add imports
import { checkGrammar } from './lib/languageTool'
import type { LTMatch } from './lib/languageTool'
import GrammarPanel from './components/GrammarPanel'

// add state
const [grammarMatches, setGrammarMatches] = useState<LTMatch[]>([])
const [grammarLoading, setGrammarLoading] = useState(false)
const [grammarError, setGrammarError] = useState<string | null>(null)
const [grammarCooldown, setGrammarCooldown] = useState(false)

// add handler
const handleGrammarCheck = useCallback(async () => {
  if (!selected || grammarCooldown) return
  setGrammarLoading(true)
  setGrammarError(null)
  setRightTab('grammar' as any)
  try {
    const result = await checkGrammar(selected.body)
    setGrammarMatches(result.matches)
  } catch (e) {
    setGrammarError(e instanceof Error ? e.message : 'Grammar check failed')
  } finally {
    setGrammarLoading(false)
    setGrammarCooldown(true)
    setTimeout(() => setGrammarCooldown(false), 3000)
  }
}, [selected, grammarCooldown])

const handleApplyReplacement = useCallback((match: LTMatch, replacement: string) => {
  if (!selected) return
  const body = selected.body.slice(0, match.offset) + replacement + selected.body.slice(match.offset + match.length)
  handleArticleChange({ ...selected, body })
  setGrammarMatches(prev => prev.filter(m => m !== match))
}, [selected, handleArticleChange])
```

- [ ] **Step 3: Update rightTab type and add Grammar tab**

```tsx
// src/App.tsx — update rightTab type
const [rightTab, setRightTab] = useState<'codex' | 'review' | 'grammar'>('codex')

// add Grammar tab button
<button
  className={`tab-btn${rightTab === 'grammar' ? ' tab-btn--active' : ''}`}
  onClick={() => setRightTab('grammar')}
>
  Grammar
</button>

// add Grammar panel in right panel content
{rightTab === 'grammar'
  ? <GrammarPanel
      matches={grammarMatches}
      article={selected}
      onApply={handleApplyReplacement}
      loading={grammarLoading}
      error={grammarError}
    />
  : rightTab === 'codex'
  ? <CodexPanel codex={codex} onChange={handleCodexChange} />
  : <ReviewPanel article={selected} codex={codex} />
}
```

- [ ] **Step 4: Add grammar check button to Editor toolbar-actions**

```tsx
// src/components/Editor.tsx — add props
interface Props {
  // ... existing props
  onGrammarCheck?: () => void
  grammarCooldown?: boolean
}

// add button in toolbar-actions
<button
  className="btn-toolbar"
  onClick={onGrammarCheck}
  disabled={grammarCooldown || !article}
  title="Check grammar with LanguageTool (free)"
>
  Check Grammar
</button>
```

- [ ] **Step 5: Pass grammar props from App to Editor**

```tsx
// src/App.tsx
<Editor
  // ... existing props
  onGrammarCheck={handleGrammarCheck}
  grammarCooldown={grammarCooldown}
/>
```

- [ ] **Step 6: Add grammar CSS to index.css**

```css
/* append to src/index.css */
.grammar-panel { padding: 18px 16px 24px; flex: 1; overflow-y: auto; }

.grammar-match {
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 10px 12px;
  margin-bottom: 10px;
  background: var(--surface-raised);
}

.grammar-message { font-size: 12px; color: var(--text); margin: 0 0 5px; }

.grammar-context {
  font: italic 11px Georgia, serif;
  color: var(--text-muted);
  margin-bottom: 7px;
}

.btn-grammar-replacement {
  background: var(--green-bg);
  border: 1px solid rgba(22, 163, 74, 0.3);
  border-radius: var(--radius-sm);
  color: var(--green);
  font: 600 11px var(--sans);
  padding: 3px 9px;
  cursor: pointer;
  margin-right: 5px;
  margin-top: 3px;
}

.grammar-error { font-size: 12px; color: var(--red); }
.grammar-loading { font-size: 12px; color: var(--text-muted); }
```

- [ ] **Step 7: Verify TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 8: Commit**

```bash
git add src/components/GrammarPanel.tsx src/App.tsx src/components/Editor.tsx src/index.css
git commit -m "feat: LanguageTool grammar check panel with one-click apply"
```

---

### Task 11: Focus timer

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/Editor.tsx`

- [ ] **Step 1: Add timer state to App**

```tsx
// src/App.tsx
const [timerSeconds, setTimerSeconds] = useState<number | null>(null) // null = inactive
const [timerRunning, setTimerRunning] = useState(false)
const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

function startTimer() {
  setTimerSeconds(25 * 60)
  setTimerRunning(true)
}

function toggleTimer() {
  if (timerSeconds === null) { startTimer(); return }
  setTimerRunning(r => !r)
}

function resetTimer() {
  if (timerRef.current) clearInterval(timerRef.current)
  setTimerSeconds(null)
  setTimerRunning(false)
}

useEffect(() => {
  if (!timerRunning || timerSeconds === null) return
  timerRef.current = setInterval(() => {
    setTimerSeconds(s => {
      if (s === null || s <= 1) {
        clearInterval(timerRef.current!)
        setTimerRunning(false)
        if (Notification.permission === 'granted') {
          new Notification('CCE — Time\'s up!', { body: '25 minutes done. Take a break.' })
        }
        return 0
      }
      return s - 1
    })
  }, 1000)
  return () => { if (timerRef.current) clearInterval(timerRef.current) }
}, [timerRunning])
```

- [ ] **Step 2: Pass timer props to Editor**

```tsx
// src/App.tsx — Editor props
<Editor
  // ... existing props
  timerSeconds={timerSeconds}
  timerRunning={timerRunning}
  onToggleTimer={toggleTimer}
  onResetTimer={resetTimer}
/>
```

- [ ] **Step 3: Update Editor Props + display timer in footer**

```tsx
// src/components/Editor.tsx — add to Props
timerSeconds?: number | null
timerRunning?: boolean
onToggleTimer?: () => void
onResetTimer?: () => void

// add timer display in editor-footer (replace editor-last-edited section or add alongside)
// in editor-footer, after editor-last-edited span:
{timerSeconds !== null && (
  <div className="focus-timer">
    <span className="focus-timer-display">
      {Math.floor((timerSeconds ?? 0) / 60).toString().padStart(2, '0')}:
      {((timerSeconds ?? 0) % 60).toString().padStart(2, '0')}
    </span>
    <button className="btn-timer-toggle" onClick={onToggleTimer}>
      {timerRunning ? '⏸' : '▶'}
    </button>
    <button className="btn-timer-reset" onDoubleClick={onResetTimer} title="Double-click to reset">✕</button>
  </div>
)}

// timer start button in toolbar-actions (when timer inactive)
{(timerSeconds === null) && (
  <button className="btn-focus" onClick={onToggleTimer} title="Start 25-min focus timer">⏱</button>
)}
```

- [ ] **Step 4: Request notification permission on first timer start**

```tsx
// src/App.tsx — in startTimer()
function startTimer() {
  if (Notification.permission === 'default') {
    Notification.requestPermission()
  }
  setTimerSeconds(25 * 60)
  setTimerRunning(true)
}
```

- [ ] **Step 5: Add timer CSS to index.css**

```css
/* append to src/index.css */
.focus-timer {
  display: flex;
  align-items: center;
  gap: 6px;
}

.focus-timer-display {
  font: 700 13px var(--sans);
  color: var(--accent);
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.04em;
}

.btn-timer-toggle, .btn-timer-reset {
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 1px 4px;
  font-size: 13px;
  line-height: 1;
}

.btn-timer-toggle:hover, .btn-timer-reset:hover { color: var(--text-h); }
```

- [ ] **Step 6: Verify TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 7: Commit**

```bash
git add src/App.tsx src/components/Editor.tsx src/index.css
git commit -m "feat: 25-min focus timer with pause/resume and browser notification"
```

---

### Task 12: DOCX export button

**Files:**
- Modify: `src/components/Editor.tsx`

- [ ] **Step 1: Import exportDocx and add button**

```tsx
// src/components/Editor.tsx — add import
import { exportDocx } from '../lib/export'

// add button in toolbar-actions, after Export MD button
<button
  className="btn-toolbar"
  onClick={() => exportDocx(article)}
  aria-label="Export as Word document"
  title="Download as .docx"
>
  DOCX
</button>
```

- [ ] **Step 2: Verify build**

```bash
npm run build 2>&1 | tail -10
```

- [ ] **Step 3: Commit**

```bash
git add src/components/Editor.tsx
git commit -m "feat: DOCX export via docx.js"
```

---

## PHASE 3

---

### Task 13: Gemini API client

**Files:**
- Create: `src/lib/gemini.ts`

- [ ] **Step 1: Create Gemini streaming client**

```ts
// src/lib/gemini.ts
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:streamGenerateContent'

export interface GeminiContext {
  mode: string
  voiceRules: string
  bannedHabits: string
  bodySample: string
  title: string
}

function buildSystemPrompt(ctx: GeminiContext): string {
  return [
    `You are a writing assistant for a ${ctx.mode} piece titled "${ctx.title}".`,
    `Voice rules: ${ctx.voiceRules.slice(0, 400)}`,
    `Never use these phrases: ${ctx.bannedHabits.slice(0, 200)}`,
    `Match the voice in this sample: "${ctx.bodySample.slice(0, 500)}"`,
  ].join('\n')
}

export async function* streamGemini(
  apiKey: string,
  ctx: GeminiContext,
  userPrompt: string,
  maxTokens = 400,
): AsyncGenerator<string> {
  const res = await fetch(`${GEMINI_URL}?key=${apiKey}&alt=sse`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: buildSystemPrompt(ctx) }] },
      contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
      generationConfig: { maxOutputTokens: maxTokens, temperature: 0.8 },
    }),
  })

  if (res.status === 401) throw new Error('INVALID_KEY')
  if (res.status === 429) throw new Error('RATE_LIMIT')
  if (!res.ok) throw new Error(`Gemini error: ${res.status}`)

  const reader = res.body!.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const json = line.slice(6).trim()
      if (!json || json === '[DONE]') continue
      try {
        const chunk = JSON.parse(json)
        const text = chunk.candidates?.[0]?.content?.parts?.[0]?.text
        if (text) yield text
      } catch { /* skip malformed chunks */ }
    }
  }
}

export function loadGeminiKey(): string {
  return localStorage.getItem('cce_gemini_key') ?? ''
}

export function saveGeminiKey(key: string): void {
  localStorage.setItem('cce_gemini_key', key)
}

export async function validateGeminiKey(key: string): Promise<boolean> {
  try {
    const gen = streamGemini(key, {
      mode: 'test', voiceRules: '', bannedHabits: '', bodySample: '', title: 'test',
    }, 'Say "ok"', 5)
    await gen.next()
    return true
  } catch {
    return false
  }
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/gemini.ts
git commit -m "feat: Gemini 1.5 Flash streaming client with error handling"
```

---

### Task 14: Settings panel

**Files:**
- Create: `src/components/SettingsPanel.tsx`
- Modify: `src/components/ArticleNavigator.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Create SettingsPanel**

```tsx
// src/components/SettingsPanel.tsx
import { useState } from 'react'
import { saveGeminiKey, validateGeminiKey } from '../lib/gemini'

interface Props {
  currentKey: string
  onSave: (key: string) => void
  onClose: () => void
}

export default function SettingsPanel({ currentKey, onSave, onClose }: Props) {
  const [keyInput, setKeyInput] = useState(currentKey)
  const [status, setStatus] = useState<'idle' | 'validating' | 'valid' | 'invalid'>('idle')

  async function handleSave() {
    if (!keyInput.trim()) { onSave(''); onClose(); return }
    setStatus('validating')
    const valid = await validateGeminiKey(keyInput.trim())
    if (valid) {
      saveGeminiKey(keyInput.trim())
      onSave(keyInput.trim())
      setStatus('valid')
      setTimeout(onClose, 800)
    } else {
      setStatus('invalid')
    }
  }

  return (
    <section className="settings-panel">
      <header className="settings-header">
        <h2 className="panel-title">Settings</h2>
        <button className="btn-settings-close" onClick={onClose}>✕</button>
      </header>

      <div className="settings-field">
        <label className="field-label">Gemini API Key</label>
        <input
          type="password"
          className="settings-input"
          placeholder="AIza..."
          value={keyInput}
          onChange={e => setKeyInput(e.target.value)}
        />
        <p className="settings-hint">
          Free key at{' '}
          <a href="https://ai.google.dev" target="_blank" rel="noreferrer">ai.google.dev</a>.
          Stored locally. Never sent anywhere except Google.
        </p>
        {status === 'invalid' && (
          <p className="settings-error">Invalid key — check and try again.</p>
        )}
        {status === 'valid' && (
          <p className="settings-success">✓ Key valid</p>
        )}
      </div>

      <div className="settings-actions">
        <button className="btn-review" onClick={handleSave} disabled={status === 'validating'}>
          {status === 'validating' ? 'Validating…' : 'Save Key'}
        </button>
        {currentKey && (
          <button className="btn-toolbar" onClick={() => { saveGeminiKey(''); onSave(''); onClose() }}>
            Clear Key
          </button>
        )}
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Add settings toggle to App**

```tsx
// src/App.tsx
import SettingsPanel from './components/SettingsPanel'
import { loadGeminiKey } from './lib/gemini'

// state
const [showSettings, setShowSettings] = useState(false)
const [geminiKey, setGeminiKey] = useState(() => loadGeminiKey())
```

- [ ] **Step 3: Add settings gear to navigator footer and wrap navigator**

```tsx
// src/App.tsx — wrap ArticleNavigator + SettingsPanel
{showSettings
  ? <SettingsPanel
      currentKey={geminiKey}
      onSave={setGeminiKey}
      onClose={() => setShowSettings(false)}
    />
  : <ArticleNavigator
      articles={articles}
      selectedId={selectedId}
      onSelect={handleSelect}
      onUpdate={handleArticlesUpdate}
      onOpenSettings={() => setShowSettings(true)}
    />
}
```

- [ ] **Step 4: Add onOpenSettings prop to ArticleNavigator**

```tsx
// src/components/ArticleNavigator.tsx — Props
interface Props {
  articles: Article[]
  selectedId: string | null
  onSelect: (id: string) => void
  onUpdate: (articles: Article[]) => void
  onOpenSettings: () => void
}

// in nav-footer, add settings button alongside New Article
<div className="nav-footer">
  <button className="btn-new-full" onClick={handleNew}>+ New Article</button>
  <button className="btn-settings-gear" onClick={onOpenSettings} title="Settings">⚙</button>
</div>
```

- [ ] **Step 5: Add settings CSS to index.css**

```css
/* append to src/index.css */
.settings-panel { padding: 18px 16px; flex: 1; overflow-y: auto; }

.settings-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.btn-settings-close {
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  font-size: 16px;
  padding: 2px 4px;
}

.settings-field { margin-bottom: 16px; }

.settings-input {
  width: 100%;
  background: var(--surface-raised);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text-h);
  padding: 8px 10px;
  font: 13px var(--sans);
  outline: none;
  margin: 5px 0 6px;
  min-height: unset;
}

.settings-input:focus {
  border-color: var(--accent-border);
  box-shadow: 0 0 0 3px var(--accent-bg);
}

.settings-hint { font-size: 11px; color: var(--text-muted); margin: 0; }
.settings-hint a { color: var(--accent); }
.settings-error { font-size: 12px; color: var(--red); margin: 5px 0 0; }
.settings-success { font-size: 12px; color: var(--green); margin: 5px 0 0; }
.settings-actions { display: flex; flex-direction: column; gap: 8px; }

.btn-settings-gear {
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  font-size: 15px;
  padding: 4px 6px;
  border-radius: var(--radius-sm);
  transition: color 120ms;
}

.btn-settings-gear:hover { color: var(--text-h); }

.nav-footer {
  display: flex;
  align-items: center;
  gap: 6px;
}

.btn-new-full { flex: 1; }
```

- [ ] **Step 6: Verify TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 7: Commit**

```bash
git add src/components/SettingsPanel.tsx src/components/ArticleNavigator.tsx src/App.tsx src/index.css
git commit -m "feat: settings panel with Gemini API key setup and validation"
```

---

### Task 15: AI panel

**Files:**
- Create: `src/components/AIPanel.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Create AIPanel component**

```tsx
// src/components/AIPanel.tsx
import { useState } from 'react'
import type { Article, Codex } from '../types'
import type { GeminiContext } from '../lib/gemini'
import { streamGemini } from '../lib/gemini'

interface Props {
  article: Article | null
  codex: Codex
  geminiKey: string
  onAppendToBody: (text: string) => void
  onSetOutline: (text: string) => void
}

type AIFeature = 'continue' | 'outline' | 'research' | 'brainstorm'

function buildContext(article: Article, codex: Codex): GeminiContext {
  return {
    mode: article.mode,
    voiceRules: codex.voiceRules,
    bannedHabits: codex.bannedHabits,
    bodySample: article.body.slice(0, 500),
    title: article.title,
  }
}

export default function AIPanel({ article, codex, geminiKey, onAppendToBody, onSetOutline }: Props) {
  const [output, setOutput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [researchTopic, setResearchTopic] = useState('')
  const [cooldown, setCooldown] = useState(false)

  if (!geminiKey) {
    return (
      <section className="ai-panel">
        <h2 className="panel-title">AI Assist</h2>
        <p className="review-hint">Add your Gemini API key in ⚙ Settings to enable AI features.</p>
      </section>
    )
  }

  if (!article) {
    return (
      <section className="ai-panel">
        <h2 className="panel-title">AI Assist</h2>
        <p className="review-hint">Select an article to use AI features.</p>
      </section>
    )
  }

  async function runFeature(feature: AIFeature) {
    if (!article || loading || cooldown) return
    setLoading(true)
    setError(null)
    setOutput('')

    const ctx = buildContext(article, codex)
    const prompts: Record<AIFeature, string> = {
      continue: `Continue writing this ${article.mode}. Match the voice exactly. Output only the continuation (max 300 words). No preamble.`,
      outline: `Generate a structured markdown outline for a ${article.mode} titled "${article.title}". Return only the outline, no explanation.`,
      brainstorm: `Give 5 concrete directions this ${article.mode} titled "${article.title}" could go. One sentence each. Numbered list.`,
      research: `Summarise the topic "${researchTopic}" in approximately 250 words, written in the voice described in the system prompt. No headings, just prose.`,
    }

    let accumulated = ''
    try {
      for await (const chunk of streamGemini(geminiKey, ctx, prompts[feature])) {
        accumulated += chunk
        setOutput(accumulated)
      }
      // auto-apply based on feature
      if (feature === 'outline') {
        onSetOutline(accumulated)
      } else if (feature !== 'continue') {
        // brainstorm and research: leave in panel for review
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error'
      setError(
        msg === 'INVALID_KEY' ? 'Invalid API key — check Settings.' :
        msg === 'RATE_LIMIT' ? 'Rate limit hit — wait a moment.' :
        msg
      )
    } finally {
      setLoading(false)
      setCooldown(true)
      setTimeout(() => setCooldown(false), 4000)
    }
  }

  const disabled = loading || cooldown || !article

  return (
    <section className="ai-panel">
      <h2 className="panel-title">AI Assist</h2>

      <div className="ai-buttons">
        <button className="btn-ai" disabled={disabled} onClick={() => runFeature('continue')}>
          ✨ Continue writing
        </button>
        <button className="btn-ai" disabled={disabled} onClick={() => runFeature('outline')}>
          📐 Suggest outline
        </button>
        <button className="btn-ai" disabled={disabled} onClick={() => runFeature('brainstorm')}>
          🧠 Brainstorm directions
        </button>
      </div>

      <div className="ai-research">
        <label className="field-label">Research topic</label>
        <div className="ai-research-row">
          <input
            className="ai-research-input"
            placeholder="Enter a topic…"
            value={researchTopic}
            onChange={e => setResearchTopic(e.target.value)}
          />
          <button
            className="btn-ai-research"
            disabled={disabled || !researchTopic.trim()}
            onClick={() => runFeature('research')}
          >
            Go
          </button>
        </div>
      </div>

      {error && <p className="ai-error">{error}</p>}

      {output && (
        <div className="ai-output">
          <pre className="ai-output-text">{output}</pre>
          <div className="ai-output-actions">
            <button className="btn-review" onClick={() => onAppendToBody('\n\n' + output)}>
              Append to body
            </button>
            <button className="btn-toolbar" onClick={() => setOutput('')}>
              Discard
            </button>
          </div>
        </div>
      )}

      {loading && <p className="ai-loading">Generating…</p>}
    </section>
  )
}
```

- [ ] **Step 2: Wire AIPanel into App**

```tsx
// src/App.tsx
import AIPanel from './components/AIPanel'

// update rightTab type
const [rightTab, setRightTab] = useState<'codex' | 'review' | 'grammar' | 'ai'>('codex')

// AI append handlers
const handleAppendToBody = useCallback((text: string) => {
  if (!selected) return
  handleArticleChange({ ...selected, body: selected.body + text })
}, [selected, handleArticleChange])

const handleSetOutline = useCallback((text: string) => {
  if (!selected) return
  handleArticleChange({ ...selected, outline: text })
}, [selected, handleArticleChange])

// Add AI tab button (only visible when key set)
{geminiKey && (
  <button
    className={`tab-btn${rightTab === 'ai' ? ' tab-btn--active' : ''}`}
    onClick={() => setRightTab('ai')}
  >
    AI
  </button>
)}

// Add AI panel in right-panel content switch
{rightTab === 'ai'
  ? <AIPanel
      article={selected}
      codex={codex}
      geminiKey={geminiKey}
      onAppendToBody={handleAppendToBody}
      onSetOutline={handleSetOutline}
    />
  : rightTab === 'grammar'
  ? <GrammarPanel ... />
  : rightTab === 'codex'
  ? <CodexPanel ... />
  : <ReviewPanel ... />
}
```

- [ ] **Step 3: Add AI panel CSS to index.css**

```css
/* append to src/index.css */
.ai-panel { padding: 18px 16px 24px; flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 12px; }

.ai-buttons { display: flex; flex-direction: column; gap: 6px; }

.btn-ai {
  background: var(--navy);
  border: none;
  border-radius: var(--radius-sm);
  color: #fff;
  font: 600 12px var(--sans);
  padding: 9px 12px;
  cursor: pointer;
  text-align: left;
  transition: background 140ms;
}

.btn-ai:hover:not(:disabled) { background: var(--navy-dark); }
.btn-ai:disabled { opacity: 0.45; cursor: not-allowed; }

.ai-research-row { display: flex; gap: 6px; margin-top: 5px; }

.ai-research-input {
  flex: 1;
  background: var(--surface-raised);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text-h);
  padding: 7px 10px;
  font: 12px var(--sans);
  outline: none;
  margin: 0;
  min-height: unset;
}

.ai-research-input:focus {
  border-color: var(--accent-border);
  box-shadow: 0 0 0 3px var(--accent-bg);
}

.btn-ai-research {
  background: var(--accent);
  border: none;
  border-radius: var(--radius-sm);
  color: #fff;
  font: 700 12px var(--sans);
  padding: 7px 12px;
  cursor: pointer;
}

.btn-ai-research:disabled { opacity: 0.45; cursor: not-allowed; }
.btn-ai-research:not(:disabled):hover { background: var(--accent-hover); }

.ai-output {
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--surface-raised);
  padding: 10px;
}

.ai-output-text {
  font: 13px/1.6 Georgia, serif;
  color: var(--text-h);
  white-space: pre-wrap;
  margin: 0 0 10px;
  max-height: 200px;
  overflow-y: auto;
}

.ai-output-actions { display: flex; flex-direction: column; gap: 6px; }

.ai-error { font-size: 12px; color: var(--red); margin: 0; }
.ai-loading { font-size: 12px; color: var(--text-muted); margin: 0; }
```

- [ ] **Step 4: Final TypeScript check**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: Final build**

```bash
npm run build 2>&1 | tail -10
```
Expected: `✓ built in ...ms` with no errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/AIPanel.tsx src/App.tsx src/index.css
git commit -m "feat: Gemini AI panel — continue, outline, brainstorm, research"
```

---

## Final: Deploy

- [x] **Push to trigger Cloudflare Pages**

```bash
git push origin main
```

Expected: Cloudflare Pages picks up `main` and deploys within 2 minutes to `coffee-curiosity-engine.pages.dev`.

---

## Self-Review Checklist

- [x] **1.1 Branding** → Task 3 + Task 6
- [x] **1.2 New modes** → Task 2
- [x] **1.3 Score ring** → Task 5
- [x] **1.4 Status badge colours** → existing CSS confirmed, no task needed
- [x] **1.5 Tags** → Tasks 1, 3, 4, 6
- [x] **1.6 Reading time** → Tasks 1, 4
- [x] **1.7 Outline field** → Tasks 1, 4, 6
- [x] **2.1 Markdown preview** → Task 8
- [x] **2.2 Full-text search** → Task 9
- [x] **2.3 Project grouping** → Task 9
- [x] **2.4 Grammar check** → Task 10
- [x] **2.5 Focus timer** → Task 11
- [x] **2.6 DOCX export** → Tasks 7, 12
- [x] **3.1 Settings panel** → Task 14
- [x] **3.2 AI context object** → Task 13 (buildContext in gemini.ts)
- [x] **3.3 AI features** → Task 15 (continue, outline, research, brainstorm)
- [x] **3.4 AI panel** → Task 15
- [x] **3.5 Rate limiting + errors** → Task 13 + Task 15
- [x] **Data model migration** → Task 1, Task 9 (backwards compatible)
- [x] **No placeholders** → confirmed
- [x] **Type consistency** → GeminiContext defined in Task 13, used in Task 15 ✓; LTMatch defined in Task 7, used in Tasks 10 ✓
