import { useEffect, useState, useCallback, useRef } from 'react'
import type { Article, Codex } from './types'
import {
  loadArticles, saveArticles,
  loadSelectedId, saveSelectedId,
  loadCodex, saveCodex,
  createArticle,
} from './lib/storage'
import { DEFAULT_CODEX } from './lib/storage'
import { checkGrammar } from './lib/languageTool'
import type { LTMatch } from './lib/languageTool'
import ArticleNavigator from './components/ArticleNavigator'
import Editor from './components/Editor'
import CodexPanel from './components/CodexPanel'
import ReviewPanel from './components/ReviewPanel'
import GrammarPanel from './components/GrammarPanel'

export type SaveStatus = 'idle' | 'saving' | 'saved'

export default function App() {
  const [articles, setArticles] = useState<Article[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [codex, setCodex] = useState<Codex>(DEFAULT_CODEX)
  const [rightTab, setRightTab] = useState<'codex' | 'review' | 'grammar'>('codex')
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [focusMode, setFocusMode] = useState(false)
  const [grammarMatches, setGrammarMatches] = useState<LTMatch[]>([])
  const [grammarLoading, setGrammarLoading] = useState(false)
  const [grammarError, setGrammarError] = useState<string | null>(null)
  const [grammarCooldown, setGrammarCooldown] = useState(false)
  const [timerSeconds, setTimerSeconds] = useState<number | null>(null)
  const [timerRunning, setTimerRunning] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
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

  const handleGrammarCheck = useCallback(async () => {
    if (!selected || grammarCooldown) return
    setGrammarLoading(true)
    setGrammarError(null)
    setRightTab('grammar')
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

  function startTimer() {
    if (Notification.permission === 'default') Notification.requestPermission()
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
            new Notification("CCE — Time's up!", { body: '25 minutes done. Take a break.' })
          }
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [timerRunning])

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
        onGrammarCheck={handleGrammarCheck}
        grammarCooldown={grammarCooldown}
        timerSeconds={timerSeconds}
        timerRunning={timerRunning}
        onToggleTimer={toggleTimer}
        onResetTimer={resetTimer}
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
          <button
            className={`tab-btn${rightTab === 'grammar' ? ' tab-btn--active' : ''}`}
            onClick={() => setRightTab('grammar')}
          >
            Grammar
          </button>
        </div>
        {rightTab === 'grammar'
          ? <GrammarPanel matches={grammarMatches} article={selected} onApply={handleApplyReplacement} loading={grammarLoading} error={grammarError} />
          : rightTab === 'codex'
          ? <CodexPanel codex={codex} onChange={handleCodexChange} />
          : <ReviewPanel article={selected} codex={codex} />
        }
      </div>
    </div>
  )
}
