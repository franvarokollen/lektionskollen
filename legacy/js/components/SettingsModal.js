// ============================================================
// SettingsModal — provider config, API keys, models, language,
// Apps Script URL, school selection trigger.
// Depends on: Icon.js (Icon/Button/Field/Input/Select/HelpTooltip/smallBtn)
// ============================================================
const { useState: useState_settings } = React;

window.SettingsModal = function SettingsModal({ config, onSave, onClose, t, onOpenSchoolPicker }) {
  const [draft, setDraft] = useState_settings(config);
  const update = (k, v) => setDraft({ ...draft, [k]: v });

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 20 }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "var(--bg-surface)", borderRadius: "var(--radius-lg)", maxWidth: 540, width: "100%", maxHeight: "90vh", overflow: "auto", boxShadow: "var(--shadow-md)" }}>
        <div style={{ padding: "18px 24px", borderBottom: "1px solid var(--border-subtle)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <window.Icon name="settings" size={18} />
            <h2 style={{ fontSize: 16, fontWeight: 600 }}>{t.settings}</h2>
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", padding: 6, color: "var(--text-secondary)", borderRadius: "var(--radius-sm)" }}>
            <window.Icon name="x" size={18} />
          </button>
        </div>

        <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 18 }}>
          <window.Field label={t.language}>
            <div style={{ display: "flex", gap: 0, border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)", overflow: "hidden", width: "fit-content" }}>
              {[["sv", "Svenska"], ["en", "English"]].map(([code, label]) => (
                <button key={code} onClick={() => update("language", code)} style={{
                  padding: "8px 16px", fontSize: 13, fontWeight: 500, border: "none",
                  background: draft.language === code ? "var(--accent)" : "var(--bg-surface)",
                  color: draft.language === code ? "#fff" : "var(--text-primary)",
                  cursor: "pointer", transition: "all 0.12s",
                }}>{label}</button>
              ))}
            </div>
          </window.Field>

          <window.Field label={t.provider}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 8 }}>
              {[
                { id: "gemini",    label: "Google Gemini" },
                { id: "anthropic", label: "Anthropic" },
                { id: "openai",    label: "ChatGPT" },
                { id: "grok",      label: "Grok (xAI)" },
                { id: "local",     label: draft.language === "sv" ? "Lokal modell" : "Local model" },
              ].map(p => (
                <button key={p.id} onClick={() => update("provider", p.id)} style={{
                  padding: "12px 10px", fontSize: 13, fontWeight: 500,
                  border: `1px solid ${draft.provider === p.id ? "var(--accent)" : "var(--border-default)"}`,
                  borderRadius: "var(--radius-md)",
                  background: draft.provider === p.id ? "var(--accent-bg)" : "var(--bg-surface)",
                  color: draft.provider === p.id ? "var(--accent)" : "var(--text-primary)",
                  cursor: "pointer", transition: "all 0.12s",
                }}>{p.label}</button>
              ))}
            </div>
          </window.Field>

          {draft.provider === "gemini" && (
            <>
              <window.Field label={<span>{t.apiKey}<window.HelpTooltip
                title={t.helpGeminiTitle}
                steps={t.helpGeminiSteps}
                linkUrl="https://aistudio.google.com/app/apikey"
                linkLabel={t.getKeyLink}
              /></span>} hint={t.geminiHelp}>
                <window.Input type="password" value={draft.geminiKey} onChange={(e) => update("geminiKey", e.target.value)} placeholder="AIza..." />
              </window.Field>
              <window.Field label={t.model}>
                <window.Select value={draft.geminiModel} onChange={(e) => update("geminiModel", e.target.value)}>
                  <option value="gemini-2.5-flash">gemini-2.5-flash (rekommenderad, snabb + gratis)</option>
                  <option value="gemini-2.5-flash-lite">gemini-2.5-flash-lite (snabbast, billigast)</option>
                  <option value="gemini-2.5-pro">gemini-2.5-pro (mest kapabel)</option>
                  <option value="gemini-3.1-flash-preview">gemini-3.1-flash-preview (nyaste)</option>
                  <option value="gemini-3.1-pro-preview">gemini-3.1-pro-preview (nyaste, kraftfullast)</option>
                </window.Select>
              </window.Field>
            </>
          )}

          {draft.provider === "anthropic" && (
            <>
              <window.Field label={<span>{t.apiKey}<window.HelpTooltip
                title={t.helpAnthropicTitle}
                steps={t.helpAnthropicSteps}
                linkUrl="https://console.anthropic.com/settings/keys"
                linkLabel={t.getKeyLink}
              /></span>} hint={t.anthropicHelp}>
                <window.Input type="password" value={draft.anthropicKey} onChange={(e) => update("anthropicKey", e.target.value)} placeholder="sk-ant-..." />
              </window.Field>
              <window.Field label={t.model}>
                <window.Select value={draft.anthropicModel} onChange={(e) => update("anthropicModel", e.target.value)}>
                  <option value="claude-sonnet-4-5-20250929">claude-sonnet-4-5</option>
                  <option value="claude-opus-4-5">claude-opus-4-5</option>
                  <option value="claude-haiku-4-5-20251001">claude-haiku-4-5</option>
                </window.Select>
              </window.Field>
            </>
          )}

          {draft.provider === "openai" && (
            <>
              <window.Field label={<span>{t.apiKey}<window.HelpTooltip
                title={t.helpOpenAITitle}
                steps={t.helpOpenAISteps}
                linkUrl="https://platform.openai.com/api-keys"
                linkLabel={t.getKeyLink}
              /></span>} hint={t.openaiHelp}>
                <window.Input type="password" value={draft.openaiKey} onChange={(e) => update("openaiKey", e.target.value)} placeholder="sk-..." />
              </window.Field>
              <window.Field label={t.model}>
                <window.Select value={draft.openaiModel} onChange={(e) => update("openaiModel", e.target.value)}>
                  <option value="gpt-5.5">gpt-5.5 ({draft.language === "sv" ? "flaggskepp" : "flagship"})</option>
                  <option value="gpt-5.4">gpt-5.4</option>
                  <option value="gpt-5.4-mini">gpt-5.4-mini ({draft.language === "sv" ? "snabbare, billigare" : "faster, cheaper"})</option>
                  <option value="gpt-5.4-nano">gpt-5.4-nano ({draft.language === "sv" ? "billigast" : "cheapest"})</option>
                </window.Select>
              </window.Field>
            </>
          )}

          {draft.provider === "grok" && (
            <>
              <window.Field label={<span>{t.apiKey}<window.HelpTooltip
                title={t.helpGrokTitle}
                steps={t.helpGrokSteps}
                linkUrl="https://console.x.ai/"
                linkLabel={t.getKeyLink}
              /></span>} hint={t.grokHelp}>
                <window.Input type="password" value={draft.grokKey} onChange={(e) => update("grokKey", e.target.value)} placeholder="xai-..." />
              </window.Field>
              <window.Field label={t.model}>
                <window.Select value={draft.grokModel} onChange={(e) => update("grokModel", e.target.value)}>
                  <option value="grok-4">grok-4 ({draft.language === "sv" ? "flaggskepp" : "flagship"})</option>
                  <option value="grok-4-0709">grok-4-0709</option>
                  <option value="grok-3">grok-3</option>
                  <option value="grok-3-mini">grok-3-mini ({draft.language === "sv" ? "snabbare, billigare" : "faster, cheaper"})</option>
                </window.Select>
              </window.Field>
            </>
          )}

          {draft.provider === "local" && (
            <>
              <window.Field label={t.baseUrl} hint={t.localHelp}>
                <window.Input value={draft.localUrl} onChange={(e) => update("localUrl", e.target.value)} placeholder="http://localhost:1234" />
              </window.Field>
              <window.Field label={t.model}>
                <window.Input value={draft.localModel} onChange={(e) => update("localModel", e.target.value)} placeholder="local-model" />
              </window.Field>
              <window.Field label={`${t.apiKey} ${t.optionalSuffix}`}>
                <window.Input type="password" value={draft.localKey} onChange={(e) => update("localKey", e.target.value)} placeholder={t.leaveBlankPlaceholder} />
              </window.Field>
            </>
          )}

          {/* Apps Script web app URL + school selection */}
          <div style={{ borderTop: "1px dashed var(--border-default)", paddingTop: 14, marginTop: 4 }}>
            <window.Field label={t.appsScriptUrlLabel} hint={t.appsScriptUrlHelp}>
              <window.Input value={draft.appsScriptUrl || ""} onChange={(e) => update("appsScriptUrl", e.target.value)}
                placeholder="https://script.google.com/macros/s/.../exec" />
            </window.Field>
            <div style={{ marginTop: 10 }}>
              <window.Field label={t.schoolIdLabel} hint={t.schoolIdHelp}>
                <div style={{ display: "flex", gap: 6 }}>
                  <window.Input value={draft.schoolName || draft.schoolId || ""} readOnly placeholder={t.schoolPickPrompt}
                    style={{ flex: 1, background: "var(--bg-secondary)", cursor: "default" }} />
                  <button type="button" onClick={() => { onClose(); setTimeout(() => onOpenSchoolPicker && onOpenSchoolPicker(), 0); }}
                    style={{ ...window.smallBtn, padding: "7px 12px" }}>
                    {t.changeSchool}
                  </button>
                </div>
              </window.Field>
            </div>
          </div>

          <div style={{ fontSize: 12, color: "var(--text-tertiary)", padding: "10px 12px", background: "var(--bg-secondary)", borderRadius: "var(--radius-md)" }}>
            🔒 {t.keyHelp}
          </div>
        </div>

        <div style={{ padding: "14px 24px", borderTop: "1px solid var(--border-subtle)", display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <window.Button variant="secondary" onClick={onClose}>{t.close}</window.Button>
          <window.Button variant="primary" onClick={() => { onSave(draft); onClose(); }}>{t.save}</window.Button>
        </div>
      </div>
    </div>
  );
};
