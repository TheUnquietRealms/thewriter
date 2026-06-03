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
      {!loading && !error && matches.length === 0 && <p className="review-hint">No issues found.</p>}
      <div className="grammar-matches">
        {matches.map((m, i) => (
          <div key={i} className="grammar-match">
            <p className="grammar-message">{m.message}</p>
            <div className="grammar-context">
              "{article.body.slice(Math.max(0, m.offset - 10), m.offset + m.length + 10)}"
            </div>
            {m.replacements.slice(0, 3).map(r => (
              <button key={r.value} className="btn-grammar-replacement" onClick={() => onApply(m, r.value)}>
                → {r.value}
              </button>
            ))}
          </div>
        ))}
      </div>
    </section>
  )
}
