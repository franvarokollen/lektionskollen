// ============================================================
// BankView + BankLessonDetail + PoolIndicator + PoolFullModal +
// SavedCountInline + VersionBadge — everything bank-related.
// Teacher lessons (blue) and substitute lessons (yellow) are shown
// as separate labelled pools inside each subject cell.
// Depends on: Icon.js, bankAPI.js, storage.js (useBankVersion),
//             lessonLibrary (from storage.js), constants.js (ACTIVE_POOL_LIMIT, APP_VERSION)
// ============================================================
const { useState: useState_bank, useMemo: useMemo_bank } = React;

// ---- BankView: top-level grid grouped by stage > grade > subject ----
window.BankView = function BankView({ onClose, onOpen, onArchive, onRefresh, loading, error, t }) {
  window.useBankVersion();
  const lessons = window.bankAPI.active();

  // Group: stage → grade → subject → []
  const grouped = useMemo_bank(() => {
    const tree = {};
    for (const l of lessons) {
      const s  = l.stage   || "—";
      const g  = l.grade   || "—";
      const sb = l.subject || "—";
      tree[s]        = tree[s]        || {};
      tree[s][g]     = tree[s][g]     || {};
      tree[s][g][sb] = tree[s][g][sb] || [];
      tree[s][g][sb].push(l);
    }
    return tree;
  }, [lessons.length, lessons.map(l => l.lesson_id).join(",")]);

  const [selectedLesson, setSelectedLesson] = useState_bank(null);
  const stages = Object.keys(grouped);

  const isSv = !!(t.bankTitle && t.bankTitle.includes("bank") || t.bankTitle?.toLowerCase().includes("bank"));

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 100,
      display: "flex", alignItems: "flex-start", justifyContent: "center", padding: 16, overflowY: "auto",
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: "var(--bg-surface)", borderRadius: "var(--radius-lg)",
        maxWidth: 1000, width: "100%", maxHeight: "92vh", overflowY: "auto",
        padding: 24, position: "relative",
      }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 10 }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 600 }}>📚 {t.bankTitle}</h2>
            <p style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>{t.bankDesc}</p>
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            {loading && <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>{t.bankLoading}</span>}
            <button onClick={onRefresh} style={window.smallBtn}>↻ {t.bankRefresh}</button>
            <button onClick={onClose} style={{ ...window.smallBtn, padding: "5px 9px" }}>✕</button>
          </div>
        </div>

        {/* Legend */}
        <div style={{ display: "flex", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 600 }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: "var(--accent)", display: "inline-block" }} />
            {t.language === "en" ? "Teacher lesson" : "Lärarlektion"}
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 600 }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: "#C9A013", display: "inline-block" }} />
            {t.language === "en" ? "Substitute lesson" : "Vikarielektion"}
          </span>
        </div>

        {error && (
          <div style={{ marginBottom: 12, padding: "8px 12px", background: "var(--warning-bg)", color: "var(--warning-text)", borderRadius: "var(--radius-sm)", fontSize: 12 }}>
            {t.bankError}: {error}
          </div>
        )}

        {stages.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--text-tertiary)", fontStyle: "italic" }}>
            {loading ? t.bankLoading : t.bankEmpty}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
            {stages.map(stage => {
              const grades = Object.keys(grouped[stage]).sort();
              return (
                <div key={stage}>
                  <div style={{
                    fontSize: 12, fontWeight: 700, color: "var(--text-tertiary)",
                    textTransform: "uppercase", letterSpacing: "0.05em",
                    marginBottom: 8, paddingBottom: 4, borderBottom: "1px solid var(--border-subtle)",
                  }}>{stage}</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    {grades.map(grade => {
                      const subjects = Object.keys(grouped[stage][grade]).sort();
                      return (
                        <div key={grade}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginBottom: 6 }}>
                            {grade}
                          </div>
                          <div style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
                            gap: 8,
                          }}>
                            {subjects.map(subject => {
                              const slots = grouped[stage][grade][subject];
                              return (
                                <SubjectCell
                                  key={subject}
                                  subject={subject}
                                  slots={slots}
                                  t={t}
                                  onSelect={setSelectedLesson}
                                />
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {selectedLesson && (
        <window.BankLessonDetail lesson={selectedLesson} t={t}
          alreadyUsed={window.lessonLibrary.hasUsed(selectedLesson.lesson_id)}
          onClose={() => setSelectedLesson(null)}
          onOpen={() => { onOpen(selectedLesson.lesson_id); setSelectedLesson(null); }}
          onArchive={() => { onArchive(selectedLesson.lesson_id); setSelectedLesson(null); }}
        />
      )}
    </div>
  );
};

// ---- SubjectCell: one card per subject, single pool ----
function SubjectCell({ subject, slots, t, onSelect }) {
  const filled = slots.length;
  const full   = filled >= window.ACTIVE_POOL_LIMIT;

  return (
    <div style={{
      border: "1px solid var(--border-subtle)",
      borderRadius: "var(--radius-md)",
      overflow: "hidden",
      background: "var(--bg-surface)",
    }}>
      {/* Subject header */}
      <div style={{
        padding: "7px 10px",
        borderBottom: "1px solid var(--border-subtle)",
        background: "var(--bg-secondary)",
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <span style={{ fontSize: 12, fontWeight: 700 }}>☕ {subject}</span>
        <span style={{ fontSize: 10, color: full ? "var(--warning-text)" : "var(--text-tertiary)", fontWeight: 600 }}>
          {filled}/{window.ACTIVE_POOL_LIMIT}
        </span>
      </div>

      {/* Lesson slots */}
      <div style={{ padding: "6px 8px", display: "flex", flexDirection: "column", gap: 3 }}>
        {Array.from({ length: window.ACTIVE_POOL_LIMIT }).map((_, i) => {
          const slot = slots[i];
          if (!slot) {
            return (
              <div key={i} style={{
                fontSize: 11, color: "var(--text-tertiary)",
                padding: "5px 8px",
                border: "1px dashed var(--border-default)",
                borderRadius: "var(--radius-sm)",
                fontStyle: "italic",
              }}>{t.bankEmptySlot}</div>
            );
          }
          const used = window.lessonLibrary.hasUsed(slot.lesson_id);
          return (
            <button key={i} onClick={() => onSelect(slot)} style={{
              textAlign: "left",
              padding: "5px 8px", fontSize: 11,
              background: used ? "var(--bg-secondary)" : "#FFF8E1",
              color: used ? "var(--text-tertiary)" : "#6B5410",
              border: `1px solid ${used ? "var(--border-subtle)" : "#E8C547"}`,
              borderRadius: "var(--radius-sm)",
              cursor: "pointer", fontWeight: 500,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              opacity: used ? 0.75 : 1,
            }} title={slot.lesson?.title || slot.topic}>
              {used ? "✓ " : ""}{slot.lesson?.title || slot.topic || "—"}
            </button>
          );
        })}
      </div>
    </div>
  );
}


// ---- BankLessonDetail: lightweight modal shown over BankView ----
window.BankLessonDetail = function BankLessonDetail({ lesson, t, onClose, onOpen, onArchive, alreadyUsed }) {
  const l      = lesson.lesson || {};
  const accent   = "#C9A013";
  const accentBg = "#FFF8E1";
  const tag    = t.substituteLesson || "Vikarielektion";

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 120,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: "var(--bg-surface)", borderRadius: "var(--radius-lg)",
        maxWidth: 520, width: "100%", maxHeight: "80vh", overflowY: "auto",
        padding: 22,
        borderTop: `4px solid ${accent}`,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6, gap: 8 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <span style={{
              display: "inline-block", fontSize: 10, fontWeight: 700,
              color: "#7A5800",
              background: accentBg,
              padding: "2px 8px", borderRadius: "var(--radius-sm)",
              textTransform: "uppercase", letterSpacing: "0.04em",
              marginBottom: 6,
            }}>
              ☕ {tag}
            </span>
            <h3 style={{ fontSize: 16, fontWeight: 600 }}>{l.title || lesson.topic || "—"}</h3>
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", fontSize: 18, cursor: "pointer", color: "var(--text-tertiary)", flexShrink: 0 }}>×</button>
        </div>

        <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginBottom: 10 }}>
          {lesson.stage} · {lesson.grade} · {lesson.subject} · {lesson.topic || "—"}
        </div>

        {l.summary && <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5, marginBottom: 10 }}>{l.summary}</p>}

        {l.learningGoal && (
          <div style={{ fontSize: 12, padding: "8px 10px", background: accentBg, color: "#7A5800", borderRadius: "var(--radius-sm)", marginBottom: 10 }}>
            <strong>{t.objective}:</strong> {l.learningGoal}
          </div>
        )}

        {alreadyUsed && (
          <div style={{ fontSize: 11, padding: "5px 9px", background: "var(--bg-secondary)", color: "var(--text-tertiary)", borderRadius: "var(--radius-sm)", marginBottom: 10, display: "inline-block" }}>
            ✓ {t.alreadyUsedHere}
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 6, marginTop: 14 }}>
          <button onClick={onArchive} style={{ ...window.smallBtn, color: "var(--warning-text)" }}>{t.archive}</button>
          <button onClick={onOpen} style={{
            ...window.smallBtn,
            background: accent, color: "#3A2C00",
            borderColor: accent,
          }}>↗ {t.open}</button>
        </div>
      </div>
    </div>
  );
};

// ---- PoolIndicator: small chip near generate buttons ----
window.PoolIndicator = function PoolIndicator({ stage, grade, subject, t, onOpen }) {
  window.useBankVersion();
  const pool = window.bankAPI.getActivePool({ stage, grade, subject, isSub: true });
  const full  = pool.length >= window.ACTIVE_POOL_LIMIT;
  if (pool.length === 0) return <span />;

    return (
    <button onClick={onOpen} title={full ? t.poolFullTitle : ""} style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      padding: "5px 10px", fontSize: 11, fontWeight: 600,
      background: full
        ? ("#FFF8E1")
        : ("#FFFDE7"),
      color: full
        ? ("#7A5800")
        : ("#6B5410"),
      border: "1px solid " + (full
        ? ("#E8C547")
        : ("#E8C547")),
      borderRadius: 999, cursor: "pointer",
    }}>
      <span style={{ fontSize: 13 }}>{"☕"}</span>
      {pool.length}/{window.ACTIVE_POOL_LIMIT} {t.poolBadge}
    </button>
  );
};

// ---- PoolFullModal ----
window.PoolFullModal = function PoolFullModal({ stage, grade, subject, isSub = true, onClose, onOpen, onArchiveAndGenerate, t }) {
  window.useBankVersion();
  const pool = useMemo_bank(
    () => window.bankAPI.getActivePool({ stage, grade, subject, isSub: true }),
    [stage, grade, subject]
  );

  const accent   = "#C9A013";
  const accentBg = "#FFF8E1";
  const label    = t.poolFullSub || (t.language === "en" ? "Substitute pool full" : "Vikariespool full");

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 110,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: "var(--bg-surface)", borderRadius: "var(--radius-lg)",
        maxWidth: 600, width: "100%", maxHeight: "85vh", overflowY: "auto",
        padding: 24, position: "relative",
        borderTop: `4px solid ${accent}`,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#7A5800", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 4 }}>
              ☕ {label}
            </div>
            <h2 style={{ fontSize: 17, fontWeight: 600 }}>⚠ {t.poolFullTitle}</h2>
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", fontSize: 20, cursor: "pointer", color: "var(--text-tertiary)" }}>×</button>
        </div>
        <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 14, lineHeight: 1.5 }}>
          {t.poolFullDesc}
        </p>
        <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginBottom: 8, fontWeight: 600 }}>
          {stage} · {grade} · {subject}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {pool.map(rec => (
            <div key={rec.lesson_id} style={{
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-md)",
              padding: "10px 12px",
              display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
            }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>
                  {rec.lesson?.title || rec.topic || "—"}
                </div>
                <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
                  {rec.topic || "—"} · {rec.created_at ? new Date(rec.created_at).toLocaleDateString() : ""}
                </div>
              </div>
              <div style={{ display: "flex", gap: 4 }}>
                <button onClick={() => onOpen(rec.lesson_id)} style={window.smallBtn}>↗ {t.open}</button>
                <button onClick={() => onArchiveAndGenerate(rec.lesson_id)} style={{
                  ...window.smallBtn,
                  background: accent,
                  color: "#3A2C00",
                  borderColor: accent,
                }} title={t.archiveAndGenerate}>📦 {t.archive}</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ---- SavedCountInline ----
window.SavedCountInline = function SavedCountInline() {
  window.useBankVersion();
  const total = window.bankAPI.active().length;
  if (total === 0) return null;
  return (
    <span style={{
      marginLeft: 6, fontSize: 11, fontWeight: 600,
      background: "var(--accent-bg)", color: "var(--accent)",
      padding: "1px 7px", borderRadius: 10,
    }}>{total}</span>
  );
};

// ---- VersionBadge ----
window.VersionBadge = function VersionBadge({ providerLabel, savedCount, onOpenLibrary }) {
  return (
    <div className="no-print" style={{
      position: "fixed", bottom: 10, right: 10, zIndex: 40,
      display: "flex", alignItems: "center", gap: 6,
      pointerEvents: "auto",
    }}>
      {savedCount > 0 && (
        <button onClick={onOpenLibrary} style={{
          fontSize: 10, fontWeight: 500,
          padding: "3px 8px",
          background: "var(--bg-surface)",
          color: "var(--text-secondary)",
          border: "1px solid var(--border-subtle)",
          borderRadius: 10, cursor: "pointer",
          opacity: 0.7,
          transition: "opacity 0.15s",
        }}
        onMouseEnter={(e) => e.currentTarget.style.opacity = "1"}
        onMouseLeave={(e) => e.currentTarget.style.opacity = "0.7"}
        title="Sparade lektioner / Saved lessons"
        >
          {savedCount} ✓
        </button>
      )}
      <span style={{
        fontSize: 10, fontWeight: 500,
        padding: "3px 8px",
        background: "var(--bg-surface)",
        color: "var(--text-tertiary)",
        border: "1px solid var(--border-subtle)",
        borderRadius: 10,
        opacity: 0.55,
        userSelect: "none",
      }}
      title={providerLabel}
      >
        v{window.APP_VERSION}
      </span>
    </div>
  );
};
