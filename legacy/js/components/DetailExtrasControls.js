// ============================================================
// DetailExtrasControls — shown in the form area above the generate
// buttons. Lets the user pick detail level and which extras should
// auto-generate as soon as the lesson is accepted.
// Depends on: nothing else from this app (pure UI)
// ============================================================

window.DetailAndExtrasControls = function DetailAndExtrasControls({
  detailLevel, setDetailLevel,
  extrasEnabled, setExtrasEnabled,
  t,
}) {
  const detailOpts = [
    { key: "quick",    label: t.detailQuick,    desc: t.detailQuickDesc },
    { key: "standard", label: t.detailStandard, desc: t.detailStandardDesc },
    { key: "full",     label: t.detailFull,     desc: t.detailFullDesc },
  ];

  const extrasList = [
    { key: "worksheet",       label: t.extrasWorksheet,       desc: t.extrasWorksheetDesc },
    { key: "anchorChart",     label: t.extrasAnchorChart,     desc: t.extrasAnchorChartDesc },
    { key: "flashcards",      label: t.extrasFlashcards,      desc: t.extrasFlashcardsDesc },
    { key: "discussionCards", label: t.extrasDiscussionCards, desc: t.extrasDiscussionCardsDesc },
    { key: "diagram",         label: t.extrasDiagram,         desc: t.extrasDiagramDesc },
    { key: "badges",          label: t.extrasBadges,          desc: t.extrasBadgesDesc },
    { key: "imageSearch",     label: t.extrasImageSearch,     desc: t.extrasImageSearchDesc },
  ];

  return (
    <div>
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
          {t.detailLevel}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 8 }}>
          {detailOpts.map(o => {
            const active = detailLevel === o.key;
            return (
              <button key={o.key} onClick={() => setDetailLevel(o.key)} style={{
                textAlign: "left", padding: "10px 12px",
                background: active ? "var(--accent-bg)" : "var(--bg-surface)",
                color: active ? "var(--accent)" : "var(--text-primary)",
                border: `1px solid ${active ? "var(--accent)" : "var(--border-default)"}`,
                borderRadius: "var(--radius-md)", cursor: "pointer",
              }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{o.label}</div>
                <div style={{ fontSize: 11, color: active ? "var(--accent)" : "var(--text-secondary)", lineHeight: 1.4 }}>{o.desc}</div>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>
          {t.extrasLabel}
        </div>
        <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginBottom: 10, lineHeight: 1.5 }}>{t.extrasHint}</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 6 }}>
          {extrasList.map(e => {
            const on = !!extrasEnabled[e.key];
            return (
              <label key={e.key} style={{
                display: "flex", gap: 8, alignItems: "flex-start",
                padding: "8px 10px",
                background: on ? "var(--accent-bg)" : "var(--bg-surface)",
                border: `1px solid ${on ? "var(--accent)" : "var(--border-default)"}`,
                borderRadius: "var(--radius-md)", cursor: "pointer",
              }}>
                <input
                  type="checkbox" checked={on}
                  onChange={(ev) => setExtrasEnabled(s => ({ ...s, [e.key]: ev.target.checked }))}
                  style={{ marginTop: 2 }}
                />
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, display: "block", color: on ? "var(--accent)" : "var(--text-primary)" }}>{e.label}</span>
                  <span style={{ fontSize: 11, color: "var(--text-secondary)", lineHeight: 1.4 }}>{e.desc}</span>
                </span>
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
};
