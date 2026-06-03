import { useState } from 'react'
import type { Article } from '../types'
import { createArticle } from '../lib/storage'
import { MODES } from '../lib/modes'
import { countWords, relativeTime } from '../lib/utils'

interface Props {
  articles: Article[]
  selectedId: string | null
  onSelect: (id: string) => void
  onUpdate: (articles: Article[]) => void
}

export default function ArticleNavigator({ articles, selectedId, onSelect, onUpdate }: Props) {
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [filter, setFilter] = useState('')

  function handleNew() {
    const article = createArticle({ title: 'Untitled' })
    const updated = [...articles, article]
    onUpdate(updated)
    onSelect(article.id)
    setFilter('')
  }

  function handleDelete(id: string) {
    const target = articles.find(a => a.id === id)
    const label = target?.title?.trim() || 'Untitled'
    if (!window.confirm(`Delete "${label}"?\n\nThis cannot be undone.`)) return
    const updated = articles.filter(a => a.id !== id)
    onUpdate(updated)
    if (selectedId === id) {
      onSelect(updated.length ? updated[updated.length - 1].id : '')
    }
  }

  function startRename(article: Article) {
    setRenamingId(article.id)
    setRenameValue(article.title)
  }

  function commitRename(id: string) {
    const updated = articles.map(a =>
      a.id === id ? { ...a, title: renameValue.trim() || 'Untitled', updatedAt: Date.now() } : a
    )
    onUpdate(updated)
    setRenamingId(null)
  }

  const tagFilter = filter.startsWith('#') ? filter.slice(1).toLowerCase() : null
  const textFilter = tagFilter ? null : filter.toLowerCase()

  const sorted = [...articles]
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .filter(a => {
      if (tagFilter) return a.tags.some(t => t.toLowerCase().includes(tagFilter))
      if (textFilter) return a.title.toLowerCase().includes(textFilter)
      return true
    })

  return (
    <aside className="navigator">
      <header className="nav-header">
        <div className="nav-brand">
          <div className="nav-logo">☕</div>
          <div className="nav-brand-text">
            <span className="nav-brand-name">Coffee Curiosity</span>
            <span className="nav-brand-sub">ENGINE</span>
          </div>
        </div>
      </header>

      <div className="nav-search-wrap">
        <input
          className="nav-search"
          placeholder="Filter…"
          value={filter}
          onChange={e => setFilter(e.target.value)}
          aria-label="Filter articles"
        />
        {filter && (
          <button
            className="nav-search-clear"
            onClick={() => setFilter('')}
            aria-label="Clear filter"
          >
            ×
          </button>
        )}
      </div>

      <ul className="nav-list" role="listbox" aria-label="Articles">
        {sorted.map(article => (
          <li
            key={article.id}
            role="option"
            aria-selected={article.id === selectedId}
            tabIndex={0}
            className={`nav-item${article.id === selectedId ? ' nav-item--active' : ''}`}
            onClick={() => onSelect(article.id)}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onSelect(article.id)
              }
            }}
          >
            {renamingId === article.id ? (
              <input
                className="rename-input"
                value={renameValue}
                autoFocus
                onChange={e => setRenameValue(e.target.value)}
                onBlur={() => commitRename(article.id)}
                onKeyDown={e => {
                  e.stopPropagation()
                  if (e.key === 'Enter') commitRename(article.id)
                  if (e.key === 'Escape') setRenamingId(null)
                }}
                onClick={e => e.stopPropagation()}
              />
            ) : (
              <>
                <div className="nav-item-main">
                  <span className="nav-item-title">{article.title || 'Untitled'}</span>
                  <span className={`nav-status nav-status--${article.status}`}>{article.status}</span>
                </div>
                <div className="nav-item-meta">
                  <span>{MODES[article.mode]?.label ?? 'Essay'}</span>
                  <span className="nav-meta-sep">·</span>
                  <span>{countWords(article.body).toLocaleString()}w</span>
                  <span className="nav-meta-sep">·</span>
                  <span>{relativeTime(article.updatedAt)}</span>
                  {article.tags.length > 0 && (
                    <>
                      <span className="nav-meta-sep">·</span>
                      {article.tags.slice(0, 2).map(tag => (
                        <span key={tag} className="nav-tag-pill">{tag}</span>
                      ))}
                    </>
                  )}
                </div>
                <div className="nav-actions" onClick={e => e.stopPropagation()}>
                  <button
                    className="btn-nav-action"
                    title="Rename"
                    aria-label="Rename article"
                    onClick={e => { e.stopPropagation(); startRename(article) }}
                  >
                    Rename
                  </button>
                  <button
                    className="btn-nav-action btn-nav-action--danger"
                    title="Delete article"
                    aria-label="Delete article"
                    onClick={e => { e.stopPropagation(); handleDelete(article.id) }}
                  >
                    Delete
                  </button>
                </div>
              </>
            )}
          </li>
        ))}

        {articles.length === 0 && (
          <li className="nav-empty">No articles yet. Press + New to begin.</li>
        )}

        {articles.length > 0 && sorted.length === 0 && (
          <li className="nav-empty">No match for "{filter}".</li>
        )}
      </ul>
      <footer className="nav-footer">
        <button className="btn-new-full" onClick={handleNew} aria-label="New article">
          + New Article
        </button>
      </footer>
    </aside>
  )
}
