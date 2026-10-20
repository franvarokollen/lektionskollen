import { useState } from 'react';
import { getConfig, saveConfig, DEFAULT_CONFIG, hostedAvailable } from '../lib/config.js';

export default function SettingsPanel({ onClose, onSaved }) {
  const [cfg, setCfg] = useState(getConfig);
  const [test, setTest] = useState(null);
  const set = (k) => (e) => setCfg((c) => ({ ...c, [k]: e.target.value }));
  const hosted = hostedAvailable();

  async function testLocal() {
    setTest({ state: 'busy', msg: 'Checking…' });
    try {
      const res = await fetch(`${cfg.baseUrl.replace(/\/$/, '')}/models`);
      const j = await res.json();
      const ids = (j.data || []).map((m) => m.id);
      setTest({ state: 'ok', msg: ids.length ? `Reachable. Models: ${ids.join(', ')}` : 'Reachable, but no models loaded' });
    } catch {
      setTest({ state: 'err', msg: 'Not reachable. Is the server running with CORS enabled (and local network access allowed)?' });
    }
  }

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-head">
          <h2>Test settings</h2>
          <button className="btn ghost" onClick={onClose}>✕</button>
        </div>

        <fieldset>
          <legend>AI source</legend>
          <div className="chips">
            <button type="button" className={`chip ${cfg.aiMode === 'direct' ? 'on' : ''}`} onClick={() => setCfg((c) => ({ ...c, aiMode: 'direct' }))}>
              Local model (this PC)
            </button>
            <button
              type="button"
              className={`chip ${cfg.aiMode === 'edge' ? 'on' : ''}`}
              disabled={!hosted}
              title={hosted ? '' : 'Not configured in this build'}
              onClick={() => setCfg((c) => ({ ...c, aiMode: 'edge' }))}
            >
              Hosted (Supabase){hosted ? '' : ' – not configured'}
            </button>
          </div>
        </fieldset>

        {cfg.aiMode === 'direct' && (
          <>
            <label>
              Server URL (OpenAI-compatible)
              <input value={cfg.baseUrl} onChange={set('baseUrl')} placeholder="http://localhost:1234/v1" />
            </label>
            <div className="grid2">
              <label>
                Model id
                <input value={cfg.model} onChange={set('model')} />
              </label>
              <label>
                JSON mode
                <select value={cfg.jsonMode} onChange={set('jsonMode')}>
                  <option value="none">none (LM Studio)</option>
                  <option value="json_object">json_object (Ollama)</option>
                </select>
              </label>
            </div>
            <p className="meta">
              LM Studio: <code>http://localhost:1234/v1</code> · Ollama: <code>http://localhost:11434/v1</code> (start with{' '}
              <code>OLLAMA_ORIGINS=*</code>)
            </p>
            <div>
              <button type="button" className="btn ghost" onClick={testLocal}>Test connection</button>
              {test && <span className={`test-msg ${test.state}`}>{test.msg}</span>}
            </div>
          </>
        )}

        {cfg.aiMode === 'edge' && (
          <p className="muted">Uses the <code>generate-lesson</code> edge function and whatever model is set in its secrets (the production path).</p>
        )}

        <div className="modal-foot">
          <button className="btn ghost" onClick={() => setCfg(DEFAULT_CONFIG)}>Reset</button>
          <button className="btn primary" onClick={() => { saveConfig(cfg); onSaved(cfg); onClose(); }}>Save</button>
        </div>
      </div>
    </div>
  );
}
