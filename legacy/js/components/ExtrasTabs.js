// ============================================================
// Extras tab renderers — one component per kind of extra:
// Worksheet / AnchorChart / Badges / Flashcards / DiscussionCards /
// Diagram / ImageSearch. Plus ExtraTabFrame wrapper and ErrorBox.
//
// Each tab is shown when the corresponding extras-checkbox is on OR
// when data already exists in the cache. They all share the same
// generate/loading/error states managed by the parent App.
// Depends on: Icon.js (Icon/Button/miniToggle), helpers.js (asLine)
// ============================================================
const { useState: useState_extras, useEffect: useEffect_extras, useRef: useRef_extras } = React;

// ---- Frame: shared layout (header buttons, loading, generate, errors) ----
function ExtraTabFrame({ children, onGenerate, loading, hasContent, t, printable, printRef }) {
  const Icon = window.Icon;
  const Button = window.Button;
  return (
    <div>
      {hasContent && (
        <div className="no-print" style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginBottom: 10 }}>
          <Button variant="ghost" icon={<Icon name="refresh" size={13} />} onClick={onGenerate}>{t.extraRegenerate}</Button>
          {printable && <Button variant="ghost" icon={<Icon name="print" size={13} />} onClick={() => window.print()}>{t.print}</Button>}
        </div>
      )}
      {!hasContent && !loading && (
        <div style={{ padding: "32px 16px", textAlign: "center" }}>
          <Button variant="primary" icon={<Icon name="sparkles" size={14} />} onClick={onGenerate}>{t.extraGenerate}</Button>
        </div>
      )}
      {loading && (
        <div style={{ padding: "32px 16px", textAlign: "center", color: "var(--text-secondary)" }}>
          <Icon name="refresh" size={20} style={{ animation: "spin 0.8s linear infinite" }} />
          <div style={{ marginTop: 8, fontSize: 13 }}>{t.extraGenerating}</div>
        </div>
      )}
      {hasContent && <div ref={printRef}>{children}</div>}
    </div>
  );
}

function ErrorBox({ msg, t }) {
  return (
    <div style={{ padding: "12px 14px", background: "var(--danger-bg)", border: "1px solid var(--danger-text)", borderRadius: "var(--radius-md)", color: "var(--danger-text)", fontSize: 13 }}>
      <strong>{t.extraError}:</strong> {msg}
    </div>
  );
}

// ---- Worksheet: printable questions + optional answer key ----
window.WorksheetTab = function WorksheetTab({ data, loading, onGenerate, t }) {
  const [showAnswers, setShowAnswers] = useState_extras(false);
  const has = data && !data._error;
  const asLine = window.asLine;
  return (
    <ExtraTabFrame onGenerate={onGenerate} loading={loading} hasContent={has} t={t} printable>
      {data?._error && <ErrorBox msg={data._error} t={t} />}
      {has && (
        <div>
          <div className="no-print" style={{ marginBottom: 12, display: "flex", gap: 6 }}>
            <button onClick={() => setShowAnswers(false)} style={window.miniToggle(!showAnswers)}>{t.printWithoutAnswers}</button>
            <button onClick={() => setShowAnswers(true)} style={window.miniToggle(showAnswers)}>{t.printWithAnswers}</button>
          </div>
          <div style={{ background: "var(--bg-surface)", padding: 20, border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)" }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>{data.title}</h2>
            {data.instructions && <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 16, fontStyle: "italic" }}>{data.instructions}</p>}
            <ol style={{ listStyle: "decimal inside", padding: 0, display: "flex", flexDirection: "column", gap: 14 }}>
              {(data.exercises || []).map((ex, i) => (
                <li key={i} style={{ fontSize: 14, lineHeight: 1.6 }}>
                  <span style={{ fontWeight: 600 }}>{asLine(ex.question)}</span>
                  {showAnswers && ex.answer && (
                    <div style={{ marginTop: 6, padding: "6px 10px", background: "var(--success-bg)", borderLeft: "3px solid var(--success-text)", borderRadius: "var(--radius-sm)", fontSize: 13 }}>
                      <strong>{t.answerKey}:</strong> {asLine(ex.answer)}
                      {ex.explanation && <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 3, fontStyle: "italic" }}>{asLine(ex.explanation)}</div>}
                    </div>
                  )}
                  {!showAnswers && <div style={{ minHeight: 24, borderBottom: "1px dotted var(--border-default)", marginTop: 4 }} />}
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </ExtraTabFrame>
  );
};

// ---- Anchor chart: structured board layout for the lesson ----
window.AnchorChartTab = function AnchorChartTab({ data, loading, onGenerate, t }) {
  const has = data && !data._error;
  const asLine = window.asLine;
  return (
    <ExtraTabFrame onGenerate={onGenerate} loading={loading} hasContent={has} t={t} printable>
      {data?._error && <ErrorBox msg={data._error} t={t} />}
      {has && (
        <div style={{ background: "#FFFEF7", border: "2px solid #E8C547", borderRadius: "var(--radius-lg)", padding: 24 }}>
          <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4, textAlign: "center", color: "#3A2C00" }}>{data.title}</h2>
          {data.subtitle && <p style={{ fontSize: 13, textAlign: "center", color: "var(--text-secondary)", marginBottom: 18, fontStyle: "italic" }}>{data.subtitle}</p>}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
            {(data.sections || []).map((sec, i) => (
              <div key={i} style={{ background: "var(--bg-surface)", border: "1px solid #E8C547", borderRadius: "var(--radius-md)", padding: "12px 14px" }}>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8, color: "#7A5800" }}>{sec.heading}</div>
                <ul style={{ listStyle: "disc inside", fontSize: 13, lineHeight: 1.6, padding: 0, margin: 0 }}>
                  {(sec.items || []).map((it, j) => <li key={j}>{asLine(it)}</li>)}
                </ul>
                {sec.visualHint && <div style={{ marginTop: 8, fontSize: 11, color: "var(--text-secondary)", fontStyle: "italic" }}>✏️ {sec.visualHint}</div>}
              </div>
            ))}
          </div>
          {data.keyTakeaway && (
            <div style={{ marginTop: 18, padding: "12px 16px", background: "#FFF4D2", border: "1px dashed #C9A013", borderRadius: "var(--radius-md)", textAlign: "center" }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#7A5800", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>★ {t.keyTakeaway}</div>
              <div style={{ fontSize: 15, fontWeight: 600 }}>{data.keyTakeaway}</div>
            </div>
          )}
        </div>
      )}
    </ExtraTabFrame>
  );
};

// ---- Badges: circular reward badges ----
window.BadgesTab = function BadgesTab({ data, loading, onGenerate, t }) {
  const has = data && !data._error;
  return (
    <ExtraTabFrame onGenerate={onGenerate} loading={loading} hasContent={has} t={t} printable>
      {data?._error && <ErrorBox msg={data._error} t={t} />}
      {has && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 14 }}>
          {(data.badges || []).map((b, i) => (
            <div key={i} style={{
              background: b.color || "#FFE8B5",
              color: b.textColor || "#3A2C00",
              border: "3px solid rgba(0,0,0,0.1)",
              borderRadius: "50%",
              aspectRatio: "1 / 1",
              padding: 16,
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center",
              boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
            }}>
              <div style={{ fontSize: 36, lineHeight: 1, marginBottom: 6 }}>{b.emoji || "⭐"}</div>
              <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 4 }}>{b.title}</div>
              <div style={{ fontSize: 10, lineHeight: 1.3, opacity: 0.85 }}>{b.criterion}</div>
            </div>
          ))}
        </div>
      )}
    </ExtraTabFrame>
  );
};

// ---- Flashcards: front/back cards with optional example ----
window.FlashcardsTab = function FlashcardsTab({ data, loading, onGenerate, t }) {
  const has = data && !data._error;
  return (
    <ExtraTabFrame onGenerate={onGenerate} loading={loading} hasContent={has} t={t} printable>
      {data?._error && <ErrorBox msg={data._error} t={t} />}
      {has && (
        <div>
          {data.title && <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>{data.title}</h3>}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
            {(data.cards || []).map((c, i) => (
              <div key={i} style={{ background: "var(--bg-surface)", border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)", overflow: "hidden" }}>
                <div style={{ padding: "12px 14px", background: "var(--accent-bg)", color: "var(--accent)", fontWeight: 700, fontSize: 16, textAlign: "center" }}>{c.front}</div>
                <div style={{ padding: "10px 14px", fontSize: 13, lineHeight: 1.5 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>{t.cardBack}</div>
                  {c.back}
                  {c.example && (
                    <div style={{ marginTop: 6, fontSize: 12, fontStyle: "italic", color: "var(--text-secondary)" }}>
                      <span style={{ fontWeight: 600 }}>{t.cardExample}:</span> {c.example}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </ExtraTabFrame>
  );
};

// ---- Discussion cards: open questions for group work ----
window.DiscussionCardsTab = function DiscussionCardsTab({ data, loading, onGenerate, t }) {
  const has = data && !data._error;
  return (
    <ExtraTabFrame onGenerate={onGenerate} loading={loading} hasContent={has} t={t} printable>
      {data?._error && <ErrorBox msg={data._error} t={t} />}
      {has && (
        <div>
          {data.title && <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{data.title}</h3>}
          {data.instructions && <p style={{ fontSize: 12, color: "var(--text-secondary)", fontStyle: "italic", marginBottom: 14 }}>{data.instructions}</p>}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
            {(data.cards || []).map((c, i) => (
              <div key={i} style={{ background: "#F4EEFB", border: "2px dashed #6B3E8E", borderRadius: "var(--radius-md)", padding: "14px 16px" }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#6B3E8E", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>#{c.n || i + 1}</div>
                <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.5, marginBottom: 8 }}>{c.question}</div>
                {c.listenFor && (
                  <div className="no-print" style={{ fontSize: 11, color: "var(--text-secondary)", fontStyle: "italic", paddingTop: 6, borderTop: "1px dashed rgba(107,62,142,0.3)" }}>
                    <strong>{t.listenFor}:</strong> {c.listenFor}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </ExtraTabFrame>
  );
};

// ---- Diagram: lazy-loads mermaid library and renders SVG ----
window.DiagramTab = function DiagramTab({ data, loading, onGenerate, t }) {
  const has = data && !data._error;
  const ref = useRef_extras(null);
  useEffect_extras(() => {
    if (!has || !ref.current) return;
    if (!window.mermaid) {
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js";
      script.onload = () => {
        window.mermaid.initialize({ startOnLoad: false, theme: "default" });
        renderMermaid();
      };
      document.head.appendChild(script);
    } else {
      renderMermaid();
    }
    async function renderMermaid() {
      try {
        const { svg } = await window.mermaid.render(`mmd-${Date.now()}`, data.code);
        if (ref.current) ref.current.innerHTML = svg;
      } catch (e) {
        if (ref.current) ref.current.innerHTML = `<div style="color:var(--danger-text);padding:12px;background:var(--danger-bg);border-radius:6px;font-size:12px;">Mermaid error: ${e.message}</div>`;
      }
    }
  }, [data, has]);

  return (
    <ExtraTabFrame onGenerate={onGenerate} loading={loading} hasContent={has} t={t} printable>
      {data?._error && <ErrorBox msg={data._error} t={t} />}
      {has && (
        <div>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{data.title}</h3>
          {data.description && <p style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 14 }}>{data.description}</p>}
          <div ref={ref} style={{ background: "var(--bg-surface)", padding: 16, border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)", overflow: "auto", textAlign: "center" }} />
          {data.useCase && <p style={{ marginTop: 8, fontSize: 11, color: "var(--text-tertiary)", fontStyle: "italic" }}>↳ {data.useCase}</p>}
        </div>
      )}
    </ExtraTabFrame>
  );
};

// ---- Image search: links to free image sources, one block per phase ----
window.ImageSearchTab = function ImageSearchTab({ data, loading, onGenerate, t }) {
  const has = data && !data._error;
  const Icon = window.Icon;
  return (
    <ExtraTabFrame onGenerate={onGenerate} loading={loading} hasContent={has} t={t}>
      {data?._error && <ErrorBox msg={data._error} t={t} />}
      {has && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {(data.phaseSearches || []).map((ph, i) => (
            <div key={i} style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)", padding: "12px 14px" }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>{ph.phaseName}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {(ph.searches || []).map((s, j) => (
                  <a key={j} href={s.url} target="_blank" rel="noopener noreferrer" style={{
                    display: "flex", gap: 10, padding: "8px 10px",
                    background: "var(--bg-secondary)", border: "1px solid var(--border-subtle)",
                    borderRadius: "var(--radius-sm)", textDecoration: "none", color: "var(--text-primary)",
                  }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.04em", minWidth: 70 }}>{s.source}</span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, display: "block" }}>"{s.query}"</span>
                      {s.why && <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>{s.why}</span>}
                    </span>
                    <Icon name="external" size={13} style={{ color: "var(--text-tertiary)", flexShrink: 0 }} />
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </ExtraTabFrame>
  );
};
