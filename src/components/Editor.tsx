import { useState, useEffect, useRef } from 'react'
import type { Article, ArticleStatus, WritingMode } from '../types'
import { exportMarkdown, getMarkdown } from '../lib/storage'
import { MODE_LIST } from '../lib/modes'
import { countWords, relativeTime } from '../lib/utils'
import type { SaveStatus } from '../App'

interface Props {
  article: Article | null
  onChange: (article: Article) => void
  saveStatus: SaveStatus
  focusMode?: boolean
  onToggleFocus?: () => void
  darkMode?: boolean
  onToggleDark?: () => void
}

const STATUSES: ArticleStatus[] = ['draft', 'review', 'published']

export default function Editor({ article, onChange, saveStatus, focusMode, onToggleFocus, darkMode, onToggleDark }: Props) {
  const [copied, setCopied] = useState(false)
  const [settingTarget, setSettingTarget] = useState(false)
  const [targetInput, setTargetInput] = useState('')
  const bodyRef = useRef<HTMLTextAreaElement>(null)

  // reset target form when switching articles
  useEffect(() => {
    setSettingTarget(false)
    setTargetInput('')
  }, [article?.id])

  // auto-resize textarea to content height
  useEffect(() => {
    const ta = bodyRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = `${Math.max(280, ta.scrollHeight)}px`
  }, [article?.body])

  if (!article) {
    return (
      <main className="editor editor--empty">
        <p>No article selected. Press <strong>+ New</strong> in the navigator to begin.</p>
      </main>
    )
  }

  function update(patch: Partial<Article>) {
    if (!article) return
    onChange({ ...article, ...patch, updatedAt: Date.now() })
  }

  async function handleCopy() {
    const md = getMarkdown(article!)
    try {
      await navigator.clipboard.writeText(md)
    } catch {
      const el = document.createElement('textarea')
      el.value = md
      el.style.position = 'fixed'
      el.style.opacity = '0'
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  function handleSetTarget(e: React.FormEvent) {
    e.preventDefault()
    const n = parseInt(targetInput, 10)
    if (n > 0) update({ wordTarget: n })
    setSettingTarget(false)
    setTargetInput('')
  }

  const words = countWords(article.body)
  const target = article.wordTarget
  const targetPct = target ? Math.min(100, Math.round((words / target) * 100)) : null
  const targetMet = target ? words >= target : false

  return (
    <main className="editor">
      <div className="editor-inner">

        <div className="editor-toolbar">
          <div className="toolbar-controls">
            <div className="toolbar-group">
              {STATUSES.map(s => (
                <button
                  key={s}
                  className={`btn-status btn-status--${s}${article.status === s ? ' btn-status--active' : ''}`}
                  onClick={() => update({ status: s })}
                  aria-pressed={article.status === s}
                >
                  {s}
                </button>
              ))}
            </div>
            <div className="toolbar-divider" />
            <select
              id="mode-select"
              className="mode-select"
              value={article.mode}
              onChange={e => update({ mode: e.target.value as WritingMode })}
              aria-label="Writing mode"
            >
              {MODE_LIST.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>

          <div className="toolbar-actions">
            {saveStatus !== 'idle' && (
              <span className={`save-indicator save-indicator--${saveStatus}`} aria-live="polite">
                {saveStatus === 'saving' ? 'Saving…' : 'Saved'}
              </span>
            )}
            <span className="editor-wordcount" aria-live="polite">
              {words.toLocaleString()}w
            </span>
            <button
              className={`btn-toolbar${copied ? ' btn-toolbar--accent' : ''}`}
              onClick={handleCopy}
              aria-label="Copy as markdown"
              title="Copy markdown to clipboard"
            >
              {copied ? 'Copied!' : 'Copy MD'}
            </button>
            <button
              className="btn-toolbar"
              onClick={() => exportMarkdown(article)}
              aria-label="Export as markdown file"
              title="Download as .md file"
            >
              Export
            </button>
            <button
              className="btn-focus"
              onClick={onToggleDark}
              aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              title={darkMode ? 'Light mode' : 'Dark mode'}
            >
              {darkMode ? '☀' : '☾'}
            </button>
            <button
              className="btn-focus"
              onClick={onToggleFocus}
              aria-label={focusMode ? 'Exit focus mode' : 'Enter focus mode'}
              title={focusMode ? 'Exit focus mode' : 'Focus mode'}
            >
              {focusMode ? '⊠' : '⊡'}
            </button>
          </div>
        </div>

        <input
          className="field-title"
          placeholder="Title"
          value={article.title}
          onChange={e => update({ title: e.target.value })}
          aria-label="Article title"
        />

        <input
          className="field-subtitle"
          placeholder="Subtitle"
          value={article.subtitle}
          onChange={e => update({ subtitle: e.target.value })}
          aria-label="Article subtitle"
        />

        <textarea
          ref={bodyRef}
          className="field-body"
          placeholder="Write here…"
          value={article.body}
          onChange={e => update({ body: e.target.value })}
          aria-label="Article body"
          spellCheck
        />

        <div className="editor-footer">
          <span className="editor-last-edited">
            Last edited {relativeTime(article.updatedAt)}
          </span>

          <div className="editor-footer-right">
            {target != null ? (
              <div className="word-target">
                <div className="word-target-track">
                  <div
                    className={`word-target-fill${targetMet ? ' word-target-fill--met' : ''}`}
                    style={{ width: `${targetPct}%` }}
                  />
                </div>
                <span className={`word-target-label${targetMet ? ' word-target-label--met' : ''}`}>
                  {words.toLocaleString()} / {target.toLocaleString()}w
                </span>
                <button
                  className="btn-target-clear"
                  onClick={() => update({ wordTarget: undefined })}
                  title="Remove word target"
                  aria-label="Remove word target"
                >
                  ×
                </button>
              </div>
            ) : settingTarget ? (
              <form className="word-target-form" onSubmit={handleSetTarget}>
                <input
                  className="word-target-input"
                  type="number"
                  placeholder="Target…"
                  value={targetInput}
                  onChange={e => setTargetInput(e.target.value)}
                  min={1}
                  autoFocus
                  aria-label="Word target"
                />
                <button type="submit" className="btn-target-set">Set</button>
                <button
                  type="button"
                  className="btn-target-cancel"
                  onClick={() => { setSettingTarget(false); setTargetInput('') }}
                >
                  ×
                </button>
              </form>
            ) : (
              <button
                className="btn-set-target"
                onClick={() => setSettingTarget(true)}
                title="Set a word count target"
              >
                Set target
              </button>
            )}
          </div>
        </div>

      </div>
    </main>
  )
}
