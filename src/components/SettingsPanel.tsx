import { saveGeminiKey } from '../lib/gemini'
import { useState } from 'react'

interface Props {
  currentKey: string
  onSave: (key: string) => void
  onClose: () => void
}

export default function SettingsPanel({ currentKey, onSave, onClose }: Props) {
  const [keyInput, setKeyInput] = useState(currentKey)

  function handleSave() {
    const key = keyInput.trim()
    saveGeminiKey(key)
    onSave(key)
    onClose()
  }

  function handleClear() {
    saveGeminiKey('')
    onSave('')
    onClose()
  }

  return (
    <section className="settings-panel">
      <header className="settings-header">
        <h2 className="panel-title">Settings</h2>
        <button className="btn-settings-close" onClick={onClose} aria-label="Close settings">✕</button>
      </header>

      <div className="settings-field">
        <label className="field-label">Gemini API Key</label>
        <input
          type="password"
          className="settings-input"
          placeholder="AIza..."
          value={keyInput}
          onChange={e => setKeyInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleSave() }}
          autoFocus
        />
        <p className="settings-hint">
          Free key at{' '}
          <a href="https://ai.google.dev" target="_blank" rel="noreferrer">ai.google.dev</a>.
          Stored locally — never sent anywhere except Google.
        </p>
      </div>

      <div className="settings-actions">
        <button className="btn-review" onClick={handleSave} disabled={!keyInput.trim()}>
          Save Key
        </button>
        {currentKey && (
          <button className="btn-toolbar" onClick={handleClear}>
            Clear Key
          </button>
        )}
      </div>
    </section>
  )
}
