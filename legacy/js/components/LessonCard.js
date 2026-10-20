// ============================================================
// LessonCard — renders a fully-generated sub lesson plan.
// Handles both teacher lessons and substitute lessons (isSub).
// Depends on: Icon.js (Icon/Button/asLine), i18n.js (t)
// ============================================================
const { useState: useState_card } = React;

window.LessonCard = function LessonCard({ lesson, t, language, onMarkUsed, onSubmitFeedback }) {
  const [markState, setMarkState]     = useState_card("idle"); // idle | confirming | done
  const [feedbackOpen, setFeedbackOpen] = useState_card(false);
  const [feedbackText, setFeedbackText] = useState_card("");
  const [feedbackState, setFeedbackState] = useState_card("idle"); // idle | sending | sent

  const Icon   = window.Icon;
  const Button = window.Button;
  const asLine = window.asLine;
  const isSv   = language !== "en";
  const l      = lesson;

  if (!l) return null;

  // ── shared style helpers ──────────────────────────────────────────────────
  const section = (title, icon, children, opts = {}) => (
    <div style={{ marginBottom: 20 }}>
      <div style={{
        fontSize: 11, fontWeight: 700, color: "var(--text-tertiary)",
        textTransform: "uppercase", letterSpacing: "0.05em",
        marginBottom: 8, display: "flex", alignItems: "center", gap: 6,
        ...opts.titleStyle,
      }}>
        {icon && <Icon name={icon} size={12} />}{title}
      </div>
      {children}
    </div>
  );

  const pill = (text, bg = "var(--bg-secondary)", color = "var(--text-secondary)") => (
    <span style={{
      display: "inline-block", fontSize: 12, padding: "3px 10px",
      background: bg, color, borderRadius: 999, fontWeight: 500,
    }}>{text}</span>
  );

  const list = (items = []) => (
    <ul style={{ listStyle: "disc inside", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 4 }}>
      {items.map((it, i) => (
        <li key={i} style={{ fontSize: 13, lineHeight: 1.6, color: "var(--text-primary)" }}>{asLine(it)}</li>
      ))}
    </ul>
  );

  const blockquote = (text) => (
    <div style={{
      padding: "10px 14px", background: "var(--accent-bg)", borderLeft: "3px solid var(--accent)",
      borderRadius: "var(--radius-sm)", fontSize: 13, fontStyle: "italic", color: "var(--text-primary)",
      whiteSpace: "pre-wrap", lineHeight: 1.6,
    }}>{text}</div>
  );

  const boardBox = (text) => (
    <div style={{
      padding: "12px 14px", background: "#F8F4EB", border: "1px dashed #C9A013",
      borderRadius: "var(--radius-md)", fontSize: 12,
      fontFamily: "ui-monospace, Menlo, monospace",
      whiteSpace: "pre-wrap", lineHeight: 1.7, color: "#3A2C00",
    }}>{text}</div>
  );

  // ── Mark used handler ────────────────────────────────────────────────────
  const handleMarkUsed = async () => {
    if (markState === "confirming") {
      setMarkState("done");
      if (onMarkUsed) await onMarkUsed();
    } else {
      setMarkState("confirming");
    }
  };

  // ── Feedback handler ─────────────────────────────────────────────────────
  const handleFeedbackSubmit = async () => {
    if (!feedbackText.trim() || feedbackState !== "idle") return;
    setFeedbackState("sending");
    try {
      if (onSubmitFeedback) await onSubmitFeedback({ text: feedbackText.trim() });
      setFeedbackState("sent");
    } catch { setFeedbackState("idle"); }
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div style={{
      background: "var(--bg-surface)", border: "1px solid var(--border-subtle)",
      borderRadius: "var(--radius-lg)", overflow: "hidden",
    }}>
      {/* ── Header ── */}
      <div style={{
        padding: "16px 20px",
        background: l.isSub ? "#FFF8E1" : "var(--accent-bg)",
        borderBottom: "1px solid var(--border-subtle)",
      }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {l.isSub && (
              <span style={{
                display: "inline-block", fontSize: 10, fontWeight: 700,
                color: "#7A5800", background: "#F5C518",
                padding: "2px 8px", borderRadius: "var(--radius-sm)",
                textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6,
              }}>☕ {t.substituteLesson}</span>
            )}
            <h2 style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.3, marginBottom: 4, color: "var(--text-primary)" }}>
              {l.title}
            </h2>
            {l.approach && (
              <div style={{ fontSize: 12, color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                <Icon name="layers" size={12} />
                <span style={{ fontWeight: 500 }}>{l.approach}</span>
                {l.approachReason && <span>— {l.approachReason}</span>}
              </div>
            )}
          </div>
          {/* Mark used button */}
          <div className="no-print">
            {markState === "done"
              ? <span style={{ fontSize: 12, color: "var(--success-text)", fontWeight: 500 }}>✓ {t.markedUsed}</span>
              : (
                <Button
                  variant={markState === "confirming" ? "primary" : "secondary"}
                  icon={<Icon name="check" size={13} />}
                  onClick={handleMarkUsed}
                >
                  {markState === "confirming"
                    ? (isSv ? "Bekräfta?" : "Confirm?")
                    : t.markUsed}
                </Button>
              )
            }
          </div>
        </div>
        {l.summary && (
          <p style={{ marginTop: 10, fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6 }}>{l.summary}</p>
        )}
      </div>

      {/* ── Body ── */}
      <div style={{ padding: "20px" }}>

        {/* Learning goal + success criteria */}
        {(l.learningGoal || l.successCriteria?.length) && (
          <div style={{
            marginBottom: 20, padding: "12px 14px",
            background: "var(--bg-secondary)", borderRadius: "var(--radius-md)",
            border: "1px solid var(--border-subtle)",
          }}>
            {l.learningGoal && (
              <div style={{ marginBottom: l.successCriteria?.length ? 10 : 0 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>
                  <Icon name="target" size={11} style={{ marginRight: 4 }} />{t.objective}
                </div>
                <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", lineHeight: 1.4 }}>{l.learningGoal}</p>
              </div>
            )}
            {l.successCriteria?.length > 0 && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>
                  {t.successCriteria}
                </div>
                {list(l.successCriteria)}
              </div>
            )}
          </div>
        )}

        {/* Sub-specific: first 60 seconds */}
        {l.isSub && l.firstSixtySeconds && (
          section(
            isSv ? "⚡ De första 60 sekunderna" : "⚡ First 60 seconds",
            null,
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {l.firstSixtySeconds.boardMessage && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-tertiary)", marginBottom: 4 }}>
                    {isSv ? "✏️ Skriv på tavlan:" : "✏️ Write on the board:"}
                  </div>
                  {boardBox(l.firstSixtySeconds.boardMessage)}
                </div>
              )}
              {l.firstSixtySeconds.greeting && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-tertiary)", marginBottom: 4 }}>
                    {isSv ? "🗣 Säg när alla sitter:" : "🗣 Say when seated:"}
                  </div>
                  {blockquote(`"${l.firstSixtySeconds.greeting}"`)}
                </div>
              )}
              {l.firstSixtySeconds.authorityTip && (
                <div style={{ fontSize: 12, color: "#7A5800", background: "#FFF8E1", padding: "8px 12px", borderRadius: "var(--radius-sm)" }}>
                  💡 {l.firstSixtySeconds.authorityTip}
                </div>
              )}
            </div>
          )
        )}

        {/* Confidence checklist */}
        {l.isSub && l.confidenceChecklist?.length > 0 && (
          section(isSv ? "✅ Checklista" : "✅ Checklist", null,
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {l.confidenceChecklist.map((item, i) => (
                <div key={i} style={{ fontSize: 13, display: "flex", alignItems: "flex-start", gap: 8 }}>
                  <span style={{ color: "var(--success-text)", flexShrink: 0 }}>☐</span>
                  <span>{String(item).replace(/^[✓☐]\s*/, "")}</span>
                </div>
              ))}
            </div>
          )
        )}

        {/* Board layout (teacher lessons) */}
        {!l.isSub && l.boardLayout && (
          section(t.boardLayout, "layers",
            boardBox(l.boardLayout)
          )
        )}

        {/* Board layout (sub lessons) */}
        {l.isSub && l.boardLayout && (
          section(t.boardLayout, "layers",
            boardBox(l.boardLayout)
          )
        )}

        {/* Materials */}
        {(l.materialsNeeded || l.materials)?.length > 0 && (
          section(t.materials, "file",
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {(l.materialsNeeded || l.materials).map((m, i) => pill(asLine(m)))}
            </div>
          )
        )}

        {/* Positive reinforcement phrases */}
        {l.isSub && l.positiveReinforcementPhrases?.length > 0 && (
          section(isSv ? "💚 Positiv förstärkning" : "💚 Positive reinforcement", null,
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {l.positiveReinforcementPhrases.map((p, i) => (
                <div key={i} style={{ fontSize: 12, color: "var(--text-primary)", padding: "5px 10px", background: "var(--bg-secondary)", borderRadius: "var(--radius-sm)", fontStyle: "italic" }}>
                  → "{asLine(p).replace(/^["']|["']$/g, "")}"
                </div>
              ))}
            </div>
          )
        )}

        {/* Phases */}
        {l.phases?.length > 0 && section(t.phases, "clock",
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {l.phases.map((phase, i) => (
              <div key={i} style={{
                border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)", overflow: "hidden",
              }}>
                {/* Phase header */}
                <div style={{
                  padding: "10px 14px", background: "var(--bg-secondary)",
                  display: "flex", alignItems: "center", gap: 10,
                  borderBottom: "1px solid var(--border-subtle)",
                }}>
                  <span style={{
                    width: 26, height: 26, borderRadius: "50%",
                    background: l.isSub ? "#F5C518" : "var(--accent)",
                    color: l.isSub ? "#3A2C00" : "#fff",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 12, fontWeight: 700, flexShrink: 0,
                  }}>{i + 1}</span>
                  <span style={{ fontWeight: 600, fontSize: 14, flex: 1 }}>{phase.name}</span>
                  <span style={{
                    fontSize: 11, fontWeight: 600,
                    color: "var(--text-tertiary)", flexShrink: 0,
                    display: "flex", alignItems: "center", gap: 4,
                  }}>
                    <Icon name="clock" size={11} />{phase.minutes} min
                  </span>
                </div>

                <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
                  {phase.purpose && (
                    <p style={{ fontSize: 12, color: "var(--text-secondary)", fontStyle: "italic", margin: 0 }}>{phase.purpose}</p>
                  )}

                  {phase.teacherDoes?.length > 0 && (
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6 }}>{t.teacherDoes}</div>
                      <ol style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 4 }}>
                        {phase.teacherDoes.map((s, j) => {
                          const line = asLine(s);
                          return (
                            <li key={j} style={{ fontSize: 13, lineHeight: 1.55, display: "flex", gap: 8 }}>
                              <span style={{ color: "var(--text-tertiary)", flexShrink: 0, fontWeight: 600, fontSize: 11, marginTop: 2 }}>
                                {line.match(/^\d+\./) ? "" : `${j+1}.`}
                              </span>
                              <span>{line.replace(/^\d+\.\s*/, "")}</span>
                            </li>
                          );
                        })}
                      </ol>
                    </div>
                  )}

                  {phase.teacherScript?.length > 0 && (
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6 }}>{t.teacherScript}</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                        {phase.teacherScript.map((s, j) => (
                          <div key={j} style={{
                            fontSize: 13, fontStyle: "italic", color: "var(--text-primary)",
                            padding: "5px 10px", background: "var(--accent-bg)",
                            borderLeft: "2px solid var(--accent)", borderRadius: "var(--radius-sm)",
                          }}>
                            "{asLine(s).replace(/^["']|["']$/g, "")}"
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {phase.studentsDo?.length > 0 && (
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6 }}>{t.studentsDo}</div>
                      {list(phase.studentsDo)}
                    </div>
                  )}

                  {phase.anticipatedResponses?.length > 0 && (
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6 }}>{t.anticipatedResponses}</div>
                      {list(phase.anticipatedResponses)}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Embedded content */}
        {l.embeddedContent && (() => {
          const ec = l.embeddedContent;
          const hasQ = ec.questions?.length;
          const hasP = ec.problems?.length;
          const hasT = ec.texts?.length;
          if (!hasQ && !hasP && !hasT) return null;
          return section(t.embeddedContent, "file", (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {hasQ > 0 && (
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 8 }}>{t.embeddedQuestions}</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {ec.questions.map((q, i) => (
                      <div key={i} style={{ background: "var(--bg-secondary)", borderRadius: "var(--radius-sm)", padding: "10px 12px" }}>
                        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Q{i+1}: {q.q}</div>
                        <div style={{ fontSize: 12, color: "var(--success-text)" }}>✓ {q.expectedAnswer}</div>
                        {q.ifStuck && <div style={{ fontSize: 11, color: "var(--text-tertiary)", fontStyle: "italic", marginTop: 3 }}>💡 {q.ifStuck}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {hasP > 0 && (
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 8 }}>{t.embeddedProblems}</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {ec.problems.map((p, i) => (
                      <div key={i} style={{ background: "var(--bg-secondary)", borderRadius: "var(--radius-sm)", padding: "10px 12px" }}>
                        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{i+1}. {p.problem}</div>
                        <div style={{ fontSize: 12, color: "var(--success-text)" }}>✓ {p.answer}</div>
                        {p.difficulty && <span style={{ fontSize: 10, color: "var(--text-tertiary)", fontStyle: "italic" }}>[{p.difficulty}]</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {hasT > 0 && (
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 8 }}>{t.embeddedTexts}</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {ec.texts.map((tx, i) => (
                      <div key={i} style={{ background: "var(--bg-secondary)", borderRadius: "var(--radius-sm)", padding: "10px 12px" }}>
                        <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>— {tx.title} —</div>
                        <p style={{ fontSize: 13, lineHeight: 1.6, marginBottom: 6 }}>{tx.content}</p>
                        {tx.purpose && <div style={{ fontSize: 11, color: "var(--text-secondary)", fontStyle: "italic" }}>📌 {tx.purpose}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ));
        })()}

        {/* Exit ticket */}
        {(l.exitTicket || l.exitExercise) && (() => {
          const et = l.exitTicket || l.exitExercise;
          return section(t.exitTicket, "check",
            <div style={{ background: "var(--bg-secondary)", borderRadius: "var(--radius-md)", padding: "12px 14px" }}>
              {et.title && <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 6 }}>{et.title}</div>}
              <p style={{ fontSize: 13, lineHeight: 1.6, marginBottom: et.purpose ? 8 : 0 }}>{et.task || et.description}</p>
              {et.purpose && <div style={{ fontSize: 11, color: "var(--text-secondary)", fontStyle: "italic" }}>📋 {et.purpose}</div>}
            </div>
          );
        })()}

        {/* Rescue activities */}
        {l.isSub && l.rescueActivities?.length > 0 && (
          section(isSv ? "🆘 Om något går fel" : "🆘 If things go wrong", null,
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {l.rescueActivities.map((r, i) => (
                <div key={i} style={{ border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)", overflow: "hidden" }}>
                  <div style={{ padding: "8px 12px", background: "#FFF8E1", fontSize: 12, fontWeight: 600, color: "#7A5800" }}>
                    {isSv ? "Situation: " : "Situation: "}{r.scenario}
                  </div>
                  <div style={{ padding: "10px 12px" }}>
                    <div style={{ fontSize: 13, lineHeight: 1.55, marginBottom: r.script ? 8 : 0 }}>{r.activity}</div>
                    {r.script && blockquote(`"${r.script}"`)}
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {/* Extra activities */}
        {l.extraActivities?.length > 0 && section(t.extraActivitiesTitle, "plus",
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {l.extraActivities.map((a, i) => (
              <div key={i} style={{ background: "var(--bg-secondary)", borderRadius: "var(--radius-sm)", padding: "10px 12px" }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{a.title}</div>
                <div style={{ fontSize: 13, lineHeight: 1.5 }}>{a.description}</div>
                {a.answer && <div style={{ fontSize: 12, color: "var(--success-text)", marginTop: 4 }}>✓ {a.answer}</div>}
              </div>
            ))}
          </div>
        )}

        {/* Extra time */}
        {l.extraTime?.length > 0 && section(t.extraTimeTitle, "clock",
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {l.extraTime.map((et, i) => (
              <div key={i} style={{
                flex: "1 1 200px", border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-md)", padding: "10px 12px",
              }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-tertiary)", marginBottom: 4 }}>+{et.minutes} min</div>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{et.title}</div>
                <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5 }}>{et.description}</div>
              </div>
            ))}
          </div>
        )}

        {/* Differentiation */}
        {l.differentiation && (l.differentiation.stod?.length || l.differentiation.utmaning?.length) && (
          section(t.differentiationTitle, "users",
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {l.differentiation.stod?.length > 0 && (
                <div style={{ background: "var(--bg-secondary)", borderRadius: "var(--radius-md)", padding: "12px 14px" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 8 }}>{t.differentiationStod}</div>
                  {list(l.differentiation.stod)}
                </div>
              )}
              {l.differentiation.utmaning?.length > 0 && (
                <div style={{ background: "var(--bg-secondary)", borderRadius: "var(--radius-md)", padding: "12px 14px" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 8 }}>{t.differentiationUtmaning}</div>
                  {list(l.differentiation.utmaning)}
                </div>
              )}
            </div>
          )
        )}

        {/* Classroom management */}
        {l.classroomManagement?.length > 0 && section(t.classroomManagement, "users",
          list(l.classroomManagement)
        )}

        {/* Common pitfalls */}
        {l.commonPitfalls?.length > 0 && section(t.commonPitfalls, "alert",
          list(l.commonPitfalls)
        )}

        {/* Teacher notes */}
        {l.teacherNotes?.length > 0 && section(t.teacherNotes, "file",
          list(l.teacherNotes)
        )}

        {/* Sub tip */}
        {l.subTip && (
          <div style={{
            marginTop: 4, padding: "10px 14px",
            background: "#FFF8E1", border: "1px solid #E8C547",
            borderRadius: "var(--radius-md)", fontSize: 13, fontWeight: 600, color: "#7A5800",
          }}>
            ★ {l.subTip}
          </div>
        )}

        {/* Curriculum link */}
        {l.lgr22_connection && section(t.lgr22, "book",
          <p style={{ fontSize: 13, lineHeight: 1.6, color: "var(--text-secondary)" }}>{l.lgr22_connection}</p>
        )}

        {/* Feedback section */}
        {l.isSub && onSubmitFeedback && (
          <div className="no-print" style={{ marginTop: 16, borderTop: "1px dashed var(--border-default)", paddingTop: 14 }}>
            <button onClick={() => setFeedbackOpen(o => !o)} style={{
              fontSize: 12, fontWeight: 500, background: "transparent",
              color: "var(--accent)", border: "none", cursor: "pointer", padding: 0,
            }}>
              {feedbackOpen ? t.feedbackHide : t.feedbackShow} {feedbackOpen ? "▴" : "▾"}
            </button>
            {feedbackOpen && (
              <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
                <textarea
                  value={feedbackText}
                  onChange={e => setFeedbackText(e.target.value)}
                  placeholder={t.feedbackPlaceholder}
                  rows={3}
                  style={{
                    width: "100%", padding: "8px 10px", fontSize: 13,
                    border: "1px solid var(--border-default)", borderRadius: "var(--radius-sm)",
                    background: "var(--bg-surface)", color: "var(--text-primary)",
                    fontFamily: "inherit", resize: "vertical",
                  }}
                />
                {feedbackState === "sent"
                  ? <span style={{ fontSize: 12, color: "var(--success-text)" }}>✓ {t.feedbackSent}</span>
                  : (
                    <Button
                      variant="secondary"
                      onClick={handleFeedbackSubmit}
                      disabled={!feedbackText.trim() || feedbackState === "sending"}
                    >
                      {feedbackState === "sending" ? t.feedbackSending : t.feedbackSubmit}
                    </Button>
                  )
                }
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
