import { useEffect, useState, useCallback, useRef } from 'react'
import type { Article, Codex } from './types'
import {
  loadArticles, saveArticles,
  loadSelectedId, saveSelectedId,
  loadCodex, saveCodex,
  createArticle,
} from './lib/storage'
import { DEFAULT_CODEX } from './lib/storage'
import ArticleNavigator from './components/ArticleNavigator'
import Editor from './components/Editor'
import CodexPanel from './components/CodexPanel'
import ReviewPanel from './components/ReviewPanel'

export type SaveStatus = 'idle' | 'saving' | 'saved'

export default function App() {
  const [articles, setArticles] = useState<Article[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [codex, setCodex] = useState<Codex>(DEFAULT_CODEX)
  const [rightTab, setRightTab] = useState<'codex' | 'review'>('codex')
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [focusMode, setFocusMode] = useState(false)
  const [darkMode, setDarkMode] = useState(() => {
    const stored = localStorage.getItem('cce_theme')
    if (stored) return stored === 'dark'
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  useEffect(() => {
    document.documentElement.dataset.theme = darkMode ? 'dark' : 'light'
    localStorage.setItem('cce_theme', darkMode ? 'dark' : 'light')
  }, [darkMode])

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingRef = useRef<Article[]>([])

  useEffect(() => {
    let loaded = loadArticles()
    const savedId = loadSelectedId()
    const savedCodex = loadCodex()

    if (!loaded.length) {
      const first = createArticle()
      loaded = [first]
      saveArticles(loaded)
      saveSelectedId(first.id)
      setSelectedId(first.id)
    } else {
      const validId = savedId && loaded.find(a => a.id === savedId) ? savedId : loaded[0].id
      setSelectedId(validId)
      saveSelectedId(validId)
    }

    setArticles(loaded)
    setCodex(savedCodex)
    pendingRef.current = loaded
  }, [])

  const handleArticlesUpdate = useCallback((updated: Article[]) => {
    setArticles(updated)
    pendingRef.current = updated
    saveArticles(updated)
  }, [])

  const handleSelect = useCallback((id: string) => {
    setSelectedId(id)
    saveSelectedId(id)
  }, [])

  const handleArticleChange = useCallback((article: Article) => {
    setArticles(prev => {
      const updated = prev.map(a => a.id === article.id ? article : a)
      pendingRef.current = updated
      return updated
    })

    setSaveStatus('saving')
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current)

    saveTimerRef.current = setTimeout(() => {
      saveArticles(pendingRef.current)
      setSaveStatus('saved')
      fadeTimerRef.current = setTimeout(() => setSaveStatus('idle'), 1500)
    }, 400)
  }, [])

  const handleCodexChange = useCallback((updated: Codex) => {
    setCodex(updated)
    saveCodex(updated)
  }, [])

  const selected = articles.find(a => a.id === selectedId) ?? null

  return (
    <div className={`app-shell${focusMode ? ' app-shell--focus' : ''}`}>
      <ArticleNavigator
        articles={articles}
        selectedId={selectedId}
        onSelect={handleSelect}
        onUpdate={handleArticlesUpdate}
      />
      <Editor
        article={selected}
        onChange={handleArticleChange}
        saveStatus={saveStatus}
        focusMode={focusMode}
        onToggleFocus={() => setFocusMode(f => !f)}
        darkMode={darkMode}
        onToggleDark={() => setDarkMode(d => !d)}
      />
      <div className="right-panel">
        <div className="right-tabs">
          <button
            className={`tab-btn${rightTab === 'codex' ? ' tab-btn--active' : ''}`}
            onClick={() => setRightTab('codex')}
          >
            Codex
          </button>
          <button
            className={`tab-btn${rightTab === 'review' ? ' tab-btn--active' : ''}`}
            onClick={() => setRightTab('review')}
          >
            Review
          </button>
        </div>
        {rightTab === 'codex'
          ? <CodexPanel codex={codex} onChange={handleCodexChange} />
          : <ReviewPanel article={selected} codex={codex} />
        }
      </div>
    </div>
  )
}
