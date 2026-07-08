import { useState } from 'react'
import type { Article, Codex, CodexOverrides, WritingMode } from '../types'
import { MODES } from '../lib/modes'

interface Props {
  codex: Codex
  onChange: (codex: Codex) => void
  currentMode?: WritingMode | null
  overrides: CodexOverrides
  onOverrideChange: (overrides: CodexOverrides) => void
}

interface Field {
  key: keyof Codex
  label: string
  placeholder: string
  rows: number
  hint?: string
}

const FIELDS: Field[] = [
  { key: 'voiceRules', label: 'Voice Rules', placeholder: 'How you write. Your commitments on the page.', rows: 4, hint: 'Sent to every AI Assist request as a system instruction.' },
  { key: 'bannedHabits', label: 'Banned AI Habits', placeholder: 'One phrase per line. Highlighted as you type.', rows: 4, hint: "Scored in Review's Voice Authenticity check and used as a quality gate on AI Assist output." },
  { key: 'recurringThemes', label: 'Recurring Themes', placeholder: 'The ideas that keep returning.', rows: 3, hint: 'Sent to AI Assist (Continue, Outline, Brainstorm, Research) so suggestions stay on-theme.' },
  { key: 'sourceNotes', label: 'Source Notes', placeholder: 'Books, articles, conversations worth tracking.', rows: 3, hint: 'Sent to AI Assist as reference material.' },
]

interface ChecklistItem {
  checked: boolean
  text: string
}

function parseChecklist(raw: string): ChecklistItem[] {
  return raw
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean)
    .map(line => {
      const m = line.match(/^-\s*\[([ xX])\]\s*(.*)$/)
      if (m) return { checked: m[1].toLowerCase() === 'x', text: m[2] }
      return { checked: false, text: line.replace(/^-\s*/, '') }
    })
}

function serializeChecklist(items: ChecklistItem[]): string {
  return items.map(i => `- [${i.checked ? 'x' : ' '}] ${i.text}`).join('\n')
}

const OVERRIDE_FIELDS: Array<{ key: 'voiceRules' | 'bannedHabits'; label: string; placeholder: string; rows: number }> = [
  { key: 'voiceRules', label: 'Voice Rules Override', placeholder: 'Leave blank to inherit global rules.', rows: 3 },
  { key: 'bannedHabits', label: 'Banned Habits Override', placeholder: 'Leave blank to inherit global habits.', rows: 3 },
]

export default function CodexPanel({ codex, onChange, currentMode, overrides, onOverrideChange }: Props) {
  const [overrideOpen, setOverrideOpen] = useState(false)
  const [newChecklistItem, setNewChecklistItem] = useState('')

  function update(key: keyof Codex, value: string) {
    onChange({ ...codex, [key]: value })
  }

  const checklistItems = parseChecklist(codex.publicationChecklist)

  function toggleChecklistItem(index: number) {
    const items = [...checklistItems]
    items[index] = { ...items[index], checked: !items[index].checked }
    update('publicationChecklist', serializeChecklist(items))
  }

  function removeChecklistItem(index: number) {
    const items = checklistItems.filter((_, i) => i !== index)
    update('publicationChecklist', serializeChecklist(items))
  }

  function addChecklistItem() {
    const text = newChecklistItem.trim()
    if (!text) return
    update('publicationChecklist', serializeChecklist([...checklistItems, { checked: false, text }]))
    setNewChecklistItem('')
  }

  function updateOverride(key: 'voiceRules' | 'bannedHabits', value: string) {
    if (!currentMode) return
    const modeOverride = overrides[currentMode] ?? {}
    const updated = { ...modeOverride, [key]: value }
    // if both fields are empty, remove the override entirely
    const isEmpty = !updated.voiceRules && !updated.bannedHabits
    const newOverrides = { ...overrides }
    if (isEmpty) {
      delete newOverrides[currentMode]
    } else {
      newOverrides[currentMode] = updated
    }
    onOverrideChange(newOverrides)
  }

  const modeOverride = currentMode ? (overrides[currentMode] ?? {}) : {}
  const modeLabel = currentMode ? MODES[currentMode]?.label : null
  const hasOverride = currentMode ? !!overrides[currentMode] : false

  return (
    <section className="codex-panel">
      <h2 className="panel-title">Thinking Codex</h2>
      {FIELDS.map(f => (
        <div key={f.key} className="codex-field">
          <label className="field-label">{f.label}</label>
          <textarea
            className="codex-textarea"
            rows={f.rows}
            placeholder={f.placeholder}
            value={codex[f.key]}
            onChange={e => update(f.key, e.target.value)}
          />
          {f.hint && <p className="codex-field-hint">{f.hint}</p>}
        </div>
      ))}

      <div className="codex-field">
        <label className="field-label">Publication Checklist</label>
        <div className="codex-checklist">
          {checklistItems.length === 0 && (
            <p className="codex-checklist-empty">No items yet — add one below.</p>
          )}
          {checklistItems.map((item, i) => (
            <div key={i} className="codex-checklist-item">
              <input
                type="checkbox"
                className="codex-checklist-checkbox"
                checked={item.checked}
                onChange={() => toggleChecklistItem(i)}
                id={`codex-checklist-${i}`}
              />
              <label
                htmlFor={`codex-checklist-${i}`}
                className={`codex-checklist-label${item.checked ? ' codex-checklist-label--done' : ''}`}
              >
                {item.text}
              </label>
              <button
                type="button"
                className="codex-checklist-remove"
                onClick={() => removeChecklistItem(i)}
                aria-label={`Remove ${item.text}`}
              >
                ×
              </button>
            </div>
          ))}
          <div className="codex-checklist-add-row">
            <input
              className="codex-checklist-add-input"
              placeholder="Add a checklist item…"
              value={newChecklistItem}
              onChange={e => setNewChecklistItem(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addChecklistItem() }}
            />
            <button type="button" className="codex-checklist-add-btn" onClick={addChecklistItem}>
              Add
            </button>
          </div>
        </div>
      </div>

      {currentMode && (
        <div className="codex-override-section">
          <button
            className="codex-override-toggle"
            onClick={() => setOverrideOpen(o => !o)}
            aria-expanded={overrideOpen}
          >
            <span className="outline-chevron">{overrideOpen ? '▾' : '▸'}</span>
            <span>{modeLabel} Override</span>
            {hasOverride && <span className="codex-override-badge">active</span>}
          </button>

          {overrideOpen && (
            <div className="codex-override-fields">
              <p className="codex-override-hint">
                Override voice rules and banned habits for <strong>{modeLabel}</strong> articles only. Blank = inherit global.
              </p>
              {OVERRIDE_FIELDS.map(f => (
                <div key={f.key} className="codex-field">
                  <label className="field-label">{f.label}</label>
                  <textarea
                    className="codex-textarea"
                    rows={f.rows}
                    placeholder={f.placeholder}
                    value={modeOverride[f.key] ?? ''}
                    onChange={e => updateOverride(f.key, e.target.value)}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  )
}
