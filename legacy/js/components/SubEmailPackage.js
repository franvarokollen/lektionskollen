// ============================================================
// SubEmailPackage — "Send to Sub" modal.
// Admin fills in: sub email, room, date, time, class.
// Generates a complete plain-text email with everything the
// sub needs embedded — no app access required.
// Depends on: Icon.js, helpers.js (asLine)
// ============================================================

const { useState: useState_email, useMemo: useMemo_email } = React;

window.SubEmailPackage = function SubEmailPackage({ lesson, stage, grade, subject, topic, duration, language = "sv", t, onClose }) {
  const isSv = (language !== "en");

  // Admin preflight fields
  const [subEmail,   setSubEmail]   = useState_email("");
  const [subName,    setSubName]    = useState_email("");
  const [room,       setRoom]       = useState_email("");
  const [date,       setDate]       = useState_email("");
  const [timeStart,  setTimeStart]  = useState_email("");
  const [timeEnd,    setTimeEnd]    = useState_email("");
  const [className,  setClassName]  = useState_email("");
  const [senderName, setSenderName] = useState_email("");
  const [extraNote,  setExtraNote]  = useState_email("");
  const [copied,     setCopied]     = useState_email(false);
  const [preview,    setPreview]    = useState_email(false);

  const asLine = window.asLine;

  // ── Build full plain-text email body ─────────────────────────────────────
  const emailBody = useMemo_email(() => {
    if (!lesson) return "";
    const l = lesson;
    const lines = [];

    const salutation = subName.trim()
      ? (isSv ? `Hej ${subName.trim()}!` : `Hi ${subName.trim()}!`)
      : (isSv ? "Hej!" : "Hi!");

    const senderLine = senderName.trim()
      ? (isSv ? `Hälsningar,\n${senderName.trim()}` : `Best regards,\n${senderName.trim()}`)
      : (isSv ? "Hälsningar,\nKoordinatorn" : "Best regards,\nThe Coordinator");

    // ── HEADER ──
    lines.push(salutation);
    lines.push("");
    if (isSv) {
      lines.push(`Du vikarierar för en lektion och nedan hittar du allt du behöver. Du behöver inte ha tillgång till några appar eller system — allt finns i detta mejl.`);
    } else {
      lines.push(`You are covering a lesson and everything you need is below. No app access required — it's all in this email.`);
    }
    lines.push("");

    // ── LOGISTICS BOX ──
    lines.push("═".repeat(52));
    lines.push(isSv ? "PRAKTISK INFORMATION" : "LOGISTICS");
    lines.push("─".repeat(52));
    if (date)       lines.push((isSv ? "Datum:    " : "Date:     ") + date);
    if (timeStart && timeEnd) lines.push((isSv ? "Tid:      " : "Time:     ") + `${timeStart} – ${timeEnd}`);
    else if (timeStart)       lines.push((isSv ? "Tid:      " : "Time:     ") + timeStart);
    if (room)       lines.push((isSv ? "Sal:      " : "Room:     ") + room);
    if (className)  lines.push((isSv ? "Klass:    " : "Class:    ") + className);
    lines.push((isSv ? "Ämne:     " : "Subject:  ") + `${subject} — ${isSv ? "Årskurs" : "Year"} ${grade}`);
    lines.push((isSv ? "Tid:      " : "Duration: ") + `${duration} min`);
    if (extraNote.trim()) {
      lines.push("");
      lines.push(isSv ? "Obs från koordinatorn:" : "Note from coordinator:");
      lines.push(extraNote.trim());
    }
    lines.push("═".repeat(52));
    lines.push("");

    // ── CONFIDENCE CHECKLIST ──
    if (l.confidenceChecklist && l.confidenceChecklist.length > 0) {
      lines.push(isSv ? "CHECKLISTA — GÖR DETTA INNAN ELEVERNA KOMMER IN" : "CHECKLIST — DO THIS BEFORE STUDENTS ARRIVE");
      lines.push("─".repeat(52));
      l.confidenceChecklist.forEach(item => {
        lines.push("  [ ] " + String(item).replace(/^✓\s*/, "").trim());
      });
      lines.push("");
    }

    // ── FIRST 60 SECONDS ──
    if (l.firstSixtySeconds) {
      const f = l.firstSixtySeconds;
      lines.push(isSv ? "⚡ DE FÖRSTA 60 SEKUNDERNA — ETABLERA DIN AUKTORITET" : "⚡ FIRST 60 SECONDS — ESTABLISH YOUR AUTHORITY");
      lines.push("─".repeat(52));
      if (f.boardMessage) {
        lines.push(isSv ? "SKRIV PÅ TAVLAN (innan eleverna kommer in):" : "WRITE ON THE BOARD (before students arrive):");
        lines.push("");
        f.boardMessage.split(/\\n|\n/).forEach(ln => lines.push("  " + ln));
        lines.push("");
      }
      if (f.greeting) {
        lines.push(isSv ? "SÄG NÄR ALLA SITTER (ca 30 sek):" : "SAY WHEN EVERYONE IS SEATED (~30 sec):");
        lines.push(`  "${f.greeting}"`);
        lines.push("");
      }
      if (f.authorityTip) {
        lines.push(isSv ? "Tips:" : "Tip:");
        lines.push("  " + f.authorityTip);
        lines.push("");
      }
    }

    // ── LESSON OVERVIEW ──
    lines.push("─".repeat(52));
    lines.push(`${isSv ? "LEKTION: " : "LESSON: "}${l.title}`);
    lines.push("─".repeat(52));
    if (l.summary)       lines.push(l.summary);
    if (l.learningGoal)  lines.push(`\n${isSv ? "Mål:" : "Goal:"} ${l.learningGoal}`);
    if (l.priorKnowledge) lines.push(`${isSv ? "Förkunskaper:" : "Prior knowledge:"} ${l.priorKnowledge}`);
    lines.push("");

    // ── MATERIALS ──
    const mats = l.materialsNeeded || l.materials || [];
    if (mats.length > 0) {
      lines.push(isSv ? "MATERIAL" : "MATERIALS");
      mats.forEach(m => lines.push("  • " + asLine(m)));
      lines.push("");
    }

    // ── PROJECTOR ──
    if (l.projectorContent && l.projectorContent !== "null") {
      lines.push(isSv ? "📽 OM PROJEKTOR FINNS" : "📽 IF PROJECTOR AVAILABLE");
      lines.push("  " + l.projectorContent);
      lines.push("");
    }

    // ── POSITIVE REINFORCEMENT PHRASES ──
    if (l.positiveReinforcementPhrases && l.positiveReinforcementPhrases.length > 0) {
      lines.push(isSv ? "💚 POSITIV FÖRSTÄRKNING — säg detta när det går bra:" : "💚 POSITIVE REINFORCEMENT — say this when things go well:");
      l.positiveReinforcementPhrases.forEach(p => lines.push(`  → "${asLine(p).replace(/^["']|["']$/g, "")}"`));
      lines.push("");
    }

    // ── LESSON PHASES ──
    if (l.phases && l.phases.length > 0) {
      lines.push(isSv ? "LEKTIONSFÖRLOPP" : "LESSON FLOW");
      lines.push("─".repeat(52));
      l.phases.forEach((phase, i) => {
        lines.push(`${i + 1}. ${phase.name}  [${phase.minutes} min]`);
        if (phase.purpose) lines.push(`   ${isSv ? "Syfte:" : "Purpose:"} ${phase.purpose}`);
        if (phase.teacherDoes && phase.teacherDoes.length > 0) {
          lines.push(`   ${isSv ? "Du gör:" : "You do:"}`);
          phase.teacherDoes.forEach((s, j) => {
            const step = asLine(s);
            // Already numbered from prompt, just indent
            lines.push("   " + (step.match(/^\d+\./) ? step : `${j + 1}. ${step}`));
          });
        }
        if (phase.teacherScript && phase.teacherScript.length > 0) {
          lines.push(`   ${isSv ? "Säg:" : "Say:"}`);
          phase.teacherScript.forEach(s => lines.push(`   "${asLine(s).replace(/^["']|["']$/g, "")}"`));
        }
        if (phase.studentsDo && phase.studentsDo.length > 0) {
          lines.push(`   ${isSv ? "Eleverna:" : "Students:"}`);
          phase.studentsDo.forEach(s => lines.push("   • " + asLine(s)));
        }
        lines.push("");
      });
    }

    // ── EMBEDDED CONTENT (questions, problems, texts) ──
    const ec = l.embeddedContent;
    if (ec) {
      const hasContent = (ec.questions?.length || ec.problems?.length || ec.texts?.length);
      if (hasContent) {
        lines.push(isSv ? "FÖRBERETT MATERIAL" : "PREPARED CONTENT");
        lines.push("─".repeat(52));

        if (ec.questions && ec.questions.length > 0) {
          lines.push(isSv ? "Frågor med svar:" : "Questions with answers:");
          ec.questions.forEach((q, i) => {
            lines.push(`  Q${i + 1}: ${q.q}`);
            lines.push(`  ${isSv ? "Svar" : "Answer"}: ${q.expectedAnswer}`);
            if (q.ifStuck) lines.push(`  ${isSv ? "Om de fastnar" : "If stuck"}: ${q.ifStuck}`);
            lines.push("");
          });
        }

        if (ec.problems && ec.problems.length > 0) {
          lines.push(isSv ? "Uppgifter med facit:" : "Problems with answers:");
          ec.problems.forEach((p, i) => {
            lines.push(`  ${i + 1}. ${p.problem}  [${p.difficulty}]`);
            lines.push(`  ${isSv ? "Facit" : "Answer"}: ${p.answer}`);
            lines.push("");
          });
        }

        if (ec.texts && ec.texts.length > 0) {
          lines.push(isSv ? "Text att använda:" : "Text to use:");
          ec.texts.forEach(tx => {
            lines.push(`  --- ${tx.title} ---`);
            lines.push("  " + tx.content.replace(/\n/g, "\n  "));
            if (tx.purpose) lines.push(`  ${isSv ? "Uppgift" : "Task"}: ${tx.purpose}`);
            lines.push("");
          });
        }
      }
    }

    // ── EXIT TICKET ──
    const et = l.exitTicket || l.exitExercise;
    if (et) {
      lines.push(isSv ? "AVSLUTANDE CHECK (sista 3-5 min)" : "EXIT TICKET (last 3-5 min)");
      lines.push("─".repeat(52));
      if (et.title) lines.push(et.title);
      lines.push(et.task || et.description || "");
      if (et.purpose) lines.push(`(${isSv ? "Lämna resultatet till ordinarie lärare" : "Leave results for the regular teacher"}: ${et.purpose})`);
      lines.push("");
    }

    // ── EXTRA ACTIVITIES ──
    if (l.extraActivities && l.extraActivities.length > 0) {
      lines.push(isSv ? "OM DU BLIR KLAR TIDIGT" : "IF YOU FINISH EARLY");
      lines.push("─".repeat(52));
      l.extraActivities.forEach((a, i) => {
        lines.push(`${i + 1}. ${a.title}`);
        lines.push("   " + a.description);
        if (a.answer) lines.push(`   ${isSv ? "Facit" : "Answer"}: ${a.answer}`);
        lines.push("");
      });
    }

    // ── RESCUE ACTIVITIES ──
    if (l.rescueActivities && l.rescueActivities.length > 0) {
      lines.push(isSv ? "🆘 OM NÅGOT GÅR FEL" : "🆘 IF THINGS GO WRONG");
      lines.push("─".repeat(52));
      l.rescueActivities.forEach(r => {
        lines.push(`Situation: ${r.scenario}`);
        lines.push(`${isSv ? "Gör:" : "Do:"} ${r.activity}`);
        if (r.script) lines.push(`${isSv ? "Säg:" : "Say:"} "${r.script}"`);
        lines.push("");
      });
    }

    // ── CLASSROOM MANAGEMENT ──
    if (l.classroomManagement && l.classroomManagement.length > 0) {
      lines.push(isSv ? "KLASSRUMSHANTERING" : "CLASSROOM MANAGEMENT");
      lines.push("─".repeat(52));
      l.classroomManagement.forEach(tip => lines.push("  • " + asLine(tip)));
      lines.push("");
    }

    // ── SUB TIP ──
    if (l.subTip) {
      lines.push("★ " + l.subTip);
      lines.push("");
    }

    // ── FOOTER ──
    lines.push("═".repeat(52));
    lines.push(isSv
      ? "Lycka till! Om du behöver hjälp, kontakta närmaste kollega."
      : "Good luck! If you need help, contact the nearest colleague.");
    lines.push("");
    lines.push(senderLine);

    return lines.join("\n");
  }, [lesson, subName, subEmail, room, date, timeStart, timeEnd, className, senderName, extraNote, isSv]);

  const subject_line = lesson
    ? (isSv
        ? `Vikarielektion ${date ? date + " " : ""}${timeStart ? timeStart + " " : ""}— ${subject} ${grade}${room ? " sal " + room : ""}`
        : `Substitute lesson ${date ? date + " " : ""}${timeStart ? timeStart + " " : ""}— ${subject} ${grade}${room ? " room " + room : ""}`)
    : "";

  const mailtoHref = `mailto:${encodeURIComponent(subEmail)}?subject=${encodeURIComponent(subject_line)}&body=${encodeURIComponent(emailBody)}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(emailBody).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const labelStyle = { fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 4 };
  const inputStyle = { width: "100%", padding: "7px 10px", fontSize: 13, border: "1px solid var(--border-default)", borderRadius: "var(--radius-sm)", background: "var(--bg-surface)", color: "var(--text-primary)", fontFamily: "inherit" };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 200, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: 16, overflowY: "auto" }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "var(--bg-surface)", borderRadius: "var(--radius-lg)", maxWidth: 580, width: "100%", marginTop: 20, marginBottom: 40, boxShadow: "0 20px 60px rgba(0,0,0,0.25)" }}>

        {/* Header */}
        <div style={{ padding: "18px 22px", borderBottom: "1px solid var(--border-subtle)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
              ✉️ {isSv ? "Skicka till vikarie" : "Send to substitute"}
            </h2>
            <p style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>
              {isSv ? "Allt vikarien behöver skickas i ett mejl — ingen app-åtkomst krävs." : "Everything the sub needs goes in one email — no app access required."}
            </p>
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", fontSize: 20, cursor: "pointer", color: "var(--text-tertiary)" }}>×</button>
        </div>

        <div style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Admin fields */}
          <div style={{ background: "var(--bg-secondary)", borderRadius: "var(--radius-md)", padding: "14px 16px" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>
              {isSv ? "Fyll i uppgifter om lektionen" : "Fill in lesson details"}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div style={{ gridColumn: "1/-1" }}>
                <label style={labelStyle}>{isSv ? "Vikariets e-post" : "Substitute email"}</label>
                <input style={inputStyle} type="email" value={subEmail} onChange={e => setSubEmail(e.target.value)} placeholder="vikarie@skola.se" />
              </div>
              <div>
                <label style={labelStyle}>{isSv ? "Vikariets namn" : "Substitute name"}</label>
                <input style={inputStyle} value={subName} onChange={e => setSubName(e.target.value)} placeholder={isSv ? "Förnamn" : "First name"} />
              </div>
              <div>
                <label style={labelStyle}>{isSv ? "Avsändarens namn" : "Your name"}</label>
                <input style={inputStyle} value={senderName} onChange={e => setSenderName(e.target.value)} placeholder={isSv ? "Koordinatorns namn" : "Coordinator name"} />
              </div>
              <div>
                <label style={labelStyle}>{isSv ? "Datum" : "Date"}</label>
                <input style={inputStyle} type="date" value={date} onChange={e => setDate(e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>{isSv ? "Sal" : "Room"}</label>
                <input style={inputStyle} value={room} onChange={e => setRoom(e.target.value)} placeholder="A204" />
              </div>
              <div>
                <label style={labelStyle}>{isSv ? "Starttid" : "Start time"}</label>
                <input style={inputStyle} type="time" value={timeStart} onChange={e => setTimeStart(e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>{isSv ? "Sluttid" : "End time"}</label>
                <input style={inputStyle} type="time" value={timeEnd} onChange={e => setTimeEnd(e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>{isSv ? "Klass" : "Class"}</label>
                <input style={inputStyle} value={className} onChange={e => setClassName(e.target.value)} placeholder="6B" />
              </div>
              <div style={{ gridColumn: "1/-1" }}>
                <label style={labelStyle}>{isSv ? "Extra meddelande (valfritt)" : "Extra note (optional)"}</label>
                <textarea style={{ ...inputStyle, resize: "vertical" }} rows={2} value={extraNote} onChange={e => setExtraNote(e.target.value)} placeholder={isSv ? "T.ex. 'Hjälpande elever: Emma, Lukas'" : "E.g. 'Helpful students: Emma, Lucas'"} />
              </div>
            </div>
          </div>

          {/* Preview toggle */}
          <button onClick={() => setPreview(p => !p)} style={{ ...window.smallBtn, textAlign: "left", display: "flex", alignItems: "center", gap: 6, justifyContent: "space-between" }}>
            <span>{isSv ? "Förhandsgranska mejlinnehåll" : "Preview email content"} {preview ? "▴" : "▾"}</span>
            <span style={{ fontSize: 10, color: "var(--text-tertiary)" }}>{emailBody.length} {isSv ? "tecken" : "chars"}</span>
          </button>

          {preview && (
            <pre style={{ fontSize: 11, lineHeight: 1.6, color: "var(--text-secondary)", background: "var(--bg-secondary)", borderRadius: "var(--radius-md)", padding: "12px 14px", overflowX: "auto", whiteSpace: "pre-wrap", wordBreak: "break-word", maxHeight: 340, overflowY: "auto", fontFamily: "ui-monospace, Menlo, monospace" }}>
              {emailBody}
            </pre>
          )}

          {/* Action buttons */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button onClick={handleCopy} style={{ flex: 1, padding: "10px 14px", fontSize: 13, fontWeight: 600, background: copied ? "var(--success-bg)" : "var(--bg-secondary)", color: copied ? "var(--success-text)" : "var(--text-primary)", border: `1px solid ${copied ? "var(--success-text)" : "var(--border-default)"}`, borderRadius: "var(--radius-md)", cursor: "pointer", transition: "all 0.2s" }}>
              {copied ? (isSv ? "✓ Kopierat!" : "✓ Copied!") : (isSv ? "📋 Kopiera text" : "📋 Copy text")}
            </button>
            <a href={mailtoHref} style={{ flex: 1, padding: "10px 14px", fontSize: 13, fontWeight: 600, background: "#F5C518", color: "#3A2C00", border: "1px solid #C9A013", borderRadius: "var(--radius-md)", cursor: "pointer", textDecoration: "none", textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
              ✉️ {isSv ? "Öppna i mejl" : "Open in email"}
            </a>
          </div>

          <p style={{ fontSize: 11, color: "var(--text-tertiary)", lineHeight: 1.5, textAlign: "center" }}>
            {isSv
              ? "\"Öppna i mejl\" öppnar din mejlklient med allt förifyllt. Om det inte fungerar, kopiera texten och klistra in manuellt."
              : "\"Open in email\" opens your mail client with everything pre-filled. If that doesn't work, copy the text and paste manually."}
          </p>
        </div>
      </div>
    </div>
  );
};
