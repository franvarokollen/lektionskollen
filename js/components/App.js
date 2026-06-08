// ============================================================
// App — top-level component. Teacher tab + Substitute tab.
// Key change: shows SubGenerationAnimation overlay during sub generation.
// On-demand extras (generate only when tab clicked — not pre-generated).
// ============================================================
const { useState: useState_app, useEffect: useEffect_app, useMemo: useMemo_app, useRef: useRef_app } = React;

window.RatingWidget = function RatingWidget({ lessonId, schoolId, existingAvg, ratingCount }) {
  const [hovered, setHovered] = useState_app(null);
  const [submitted, setSubmitted] = useState_app(false);
  const [saving, setSaving] = useState_app(false);
  const handleRate = async (val) => {
    if (saving || submitted) return;
    setSaving(true);
    try { await window.qualityAPI.rate({ lessonId, schoolId, rating: val }); setSubmitted(true); }
    catch (e) { console.error("Rating failed", e); }
    finally { setSaving(false); }
  };
  const displayAvg = existingAvg != null ? existingAvg.toFixed(1) : null;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
      <div style={{ display: "flex", gap: 3 }}>
        {Array.from({ length: 10 }, (_, i) => i + 1).map(n => {
          const active = hovered != null ? n <= hovered : submitted && existingAvg != null && n <= Math.round(existingAvg);
          return (
            <button key={n} onMouseEnter={() => !submitted && setHovered(n)} onMouseLeave={() => !submitted && setHovered(null)} onClick={() => handleRate(n)} disabled={saving || submitted}
              style={{ width: 22, height: 22, border: "none", borderRadius: 4, cursor: submitted ? "default" : "pointer", fontSize: 11, fontWeight: 600, background: active ? "var(--accent)" : "var(--bg-secondary)", color: active ? "#fff" : "var(--text-tertiary)", transition: "all 0.1s" }}>
              {n}
            </button>
          );
        })}
      </div>
      {displayAvg && <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>⌀ {displayAvg}/10 ({ratingCount})</span>}
      {submitted && <span style={{ fontSize: 11, color: "var(--success-text)", fontWeight: 500 }}>✓ Tack!</span>}
    </div>
  );
};


// Simple error boundary to show errors instead of white page
class LessonErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 20, background: "var(--danger-bg)", border: "1px solid var(--danger-text)", borderRadius: 8, margin: 16, fontSize: 13, color: "var(--danger-text)" }}>
          <strong>Render error:</strong> {String(this.state.error.message)}
          <br /><button onClick={() => this.setState({ error: null })} style={{ marginTop: 8, padding: "4px 10px", fontSize: 12, cursor: "pointer" }}>Dismiss</button>
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  const Icon = window.Icon; const Button = window.Button; const Field = window.Field;
  const Input = window.Input; const Select = window.Select; const LangToggle = window.LangToggle;
  const asLine = window.asLine;

  const [config, setConfig] = useState_app(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(window.STORAGE_KEY) || "{}");
      if (saved && typeof saved === "object" && Object.keys(saved).length > 0) {
        return { ...window.DEFAULT_CONFIG, ...saved };
      }
    } catch {}
    return window.DEFAULT_CONFIG;
  });
  const [showSettings, setShowSettings] = useState_app(false);
  const [showBank, setShowBank] = useState_app(false);
  const [showSchoolPicker, setShowSchoolPicker] = useState_app(false);
  const [bankLoading, setBankLoading] = useState_app(false);
  const [bankError, setBankError] = useState_app("");
  const [showPoolFull, setShowPoolFull] = useState_app(false);

  const [pageTab, setPageTab] = useState_app("sub");
  const isSub = true; // App is sub-only

  const [stage, setStage] = useState_app("");
  const [grade, setGrade] = useState_app("");
  const [subject, setSubject] = useState_app("");
  const [topic, setTopic] = useState_app("");
  const [duration, setDuration] = useState_app(60);

  const [ctxTeacher, setCtxTeacher] = useState_app("");
  const [ctxClass, setCtxClass] = useState_app("");
  const [ctxDay, setCtxDay] = useState_app("");
  const [ctxTime, setCtxTime] = useState_app("");
  const [ctxRoom, setCtxRoom] = useState_app("");

  const [detailLevel, setDetailLevel] = useState_app("standard");
  const [subDetailLevel, setSubDetailLevel] = useState_app("standard");

  const [extrasEnabled, setExtrasEnabled] = useState_app({ worksheet: true, anchorChart: true, badges: false, flashcards: false, discussionCards: false, diagram: false, imageSearch: false });
  const [extrasCache, setExtrasCache] = useState_app({});
  const [loadingExtras, setLoadingExtras] = useState_app({});
  const [activeTab, setActiveTab] = useState_app({});

  const [acceptedLesson, setAcceptedLesson] = useState_app(null);
  const [loadingChoices, setLoadingChoices] = useState_app(false);
  // Separate state for sub generation to show animation
  const [generatingSub, setGeneratingSub] = useState_app(false);
  const [showEmailPackage, setShowEmailPackage] = useState_app(false);
  const [showFillerBank, setShowFillerBank] = useState_app(false);
  const [translating, setTranslating] = useState_app(false);
  const [servedFromBank, setServedFromBank] = useState_app(false);

  const [topicSuggestions, setTopicSuggestions] = useState_app([]);
  const [loadingTopics, setLoadingTopics] = useState_app(false);
  const [poolTopics, setPoolTopics] = useState_app(new Set());
  const [error, setError] = useState_app("");

  const t = window.LANG[config.language] || window.LANG.sv;

  const saveConfig = (next) => {
    setConfig(next);
    try { localStorage.setItem(window.STORAGE_KEY, JSON.stringify(next)); } catch {}
  };

  const refreshBank = async () => {
    setBankLoading(true); setBankError("");
    try { await window.bankAPI.refresh(); }
    catch (e) { console.error("Bank refresh failed", e); setBankError(String(e.message || e)); }
    finally { setBankLoading(false); }
  };
  useEffect_app(() => { refreshBank(); }, []);

  const refreshSchools = async () => {
    try { await window.schoolsAPI.refresh(); } catch (e) { console.error("Schools refresh failed", e); }
  };
  useEffect_app(() => {
    (async () => {
      await refreshSchools();
      const known = window.schoolsAPI.all().some(s => s.school_id === config.schoolId);
      if (!known) setShowSchoolPicker(true);
    })();
  }, []);

  const handleSelectSchool = (school) => { saveConfig({ ...config, schoolId: school.school_id, schoolName: school.name }); setShowSchoolPicker(false); };
  const handleCreateSchool = async (name) => await window.schoolsAPI.create(null, name);

  useEffect_app(() => { setGrade(""); setSubject(""); setTopicSuggestions([]); setPoolTopics(new Set()); }, [stage]);
  useEffect_app(() => { setTopicSuggestions([]); setPoolTopics(new Set()); }, [grade, subject, config.language]);
  useEffect_app(() => { setAcceptedLesson(null); setTopicSuggestions([]); setPoolTopics(new Set()); }, [pageTab]);

  useEffect_app(() => {
    if (!stage || !grade || !subject) { setPoolTopics(new Set()); return; }
    const pool = window.bankAPI.getActivePool({ stage, grade, subject, isSub });
    setPoolTopics(new Set(pool.map(l => l.topic).filter(Boolean)));
  }, [stage, grade, subject, pageTab]);

  const translateRef = useRef_app(null);
  const firstLangRender = useRef_app(true);
  useEffect_app(() => {
    if (firstLangRender.current) { firstLangRender.current = false; return; }
    setExtrasCache({}); setLoadingExtras({});
    if (acceptedLesson) {
      if (config.language === "sv") {
        const rec = window.bankAPI.byId(acceptedLesson.id);
        const svLesson = rec?.lesson?.translations?.sv || rec?.lesson;
        if (svLesson) setAcceptedLesson(prev => prev ? { ...svLesson, id: prev.id, isSub: prev.isSub, ctx: prev.ctx } : prev);
      } else if (translateRef.current) {
        translateRef.current(acceptedLesson.id, config.language);
      }
    }
  }, [config.language]);

  const hasKey = useMemo_app(() => {
    if (config.provider === "gemini") return !!config.geminiKey;
    if (config.provider === "anthropic") return !!config.anthropicKey;
    if (config.provider === "openai") return !!config.openaiKey;
    if (config.provider === "grok") return !!config.grokKey;
    if (config.provider === "local") return !!config.localUrl;
    return false;
  }, [config]);

  const grades = stage ? window.STAGES[stage] : [];
  const subjects = stage ? window.SUBJECTS_BY_STAGE[stage] : [];
  const canGenerate = stage && grade && subject && topic.trim() && hasKey;
  const canSuggestTopics = stage && grade && subject && hasKey;

  const currentProviderModel = () => {
    const p = config.provider;
    const modelMap = { gemini: config.geminiModel, anthropic: config.anthropicModel, openai: config.openaiModel, grok: config.grokModel, local: config.localModel };
    return { provider: p, model: modelMap[p] || "" };
  };

  const suggestTopics = async (append = false) => {
    if (!canSuggestTopics) return;
    setError(""); setLoadingTopics(true);
    try {
      const result = await window.runLLM(config, window.topicSuggestionsPrompt({ stage, grade, subject, language: config.language, exclude: append ? topicSuggestions : [] }));
      const next = Array.isArray(result?.topics) ? result.topics : [];
      const combined = append ? [...topicSuggestions, ...next] : next;
      setTopicSuggestions(combined);
      const pool = window.bankAPI.getActivePool({ stage, grade, subject, isSub });
      const matched = new Set();
      for (const s of combined) {
        for (const l of pool) { if (window.similarityRatio(s, l.topic || "") >= 0.55) { matched.add(s); break; } }
      }
      setPoolTopics(prev => new Set([...prev, ...matched]));
    } catch (e) { setError(`${t.error}: ${e.message}`); }
    finally { setLoadingTopics(false); }
  };

  const simulatedDelay = () => new Promise(res => setTimeout(res, 1500 + Math.random() * 3000));

  const generateLesson = async () => {
    if (!canGenerate) return;
    const activePool = window.bankAPI.getActivePool({ stage, grade, subject, isSub });
    if (activePool.length >= window.ACTIVE_POOL_LIMIT) { setShowPoolFull(true); return; }

    setError("");
    // Show animation for sub, spinner for teacher
    if (isSub) setGeneratingSub(true);
    else setLoadingChoices(true);
    setAcceptedLesson(null); setServedFromBank(false);

    try {
      const match = window.bankAPI.findBestMatch({ stage, grade, subject, topic, isSub });
      if (match) {
        await simulatedDelay();
        const view = match.lesson?.translations?.[config.language] || match.lesson?.translations?.sv || match.lesson;
        const ctx = { teacher: ctxTeacher, className: ctxClass, day: ctxDay, time: ctxTime, room: ctxRoom };
        const accepted = { ...view, id: match.lesson_id, isSub, ctx };
        setAcceptedLesson(accepted);
        setActiveTab(tabs => ({ ...tabs, [accepted.id]: "plan" }));
        setServedFromBank(true);
        if (config.language !== "sv" && !match.lesson?.translations?.[config.language]) translateAndApplyLesson(match.lesson_id, config.language);
        return;
      }

      const { provider, model } = currentProviderModel();
      const activeDetailLevel = isSub ? subDetailLevel : detailLevel;
      const result = await window.runLLM(config,
        isSub
          ? window.subPrompt({ stage, grade, subject, topic, duration, baseLesson: null, language: "sv", detailLevel: activeDetailLevel })
          : window.lessonPrompt({ stage, grade, subject, topic, duration, branchIndex: 0, totalBranches: 1, language: "sv", detailLevel })
      );
      result.translations = { sv: { ...result } };
      if (isSub) result.isSub = true;

      let record;
      try {
        record = await window.bankAPI.addLesson(null, { schoolId: config.schoolId || "school-1", stage, grade, subject, topic, title: result.title || topic, duration, lesson: result, provider, model });
      } catch (e) {
        if (e.code === "pool_full") { await refreshBank(); setShowPoolFull(true); return; }
        throw e;
      }

      const ctx = { teacher: ctxTeacher, className: ctxClass, day: ctxDay, time: ctxTime, room: ctxRoom };
      const accepted = { ...result, id: record.lesson_id, isSub, ctx };
      setAcceptedLesson(accepted);
      setActiveTab(tabs => ({ ...tabs, [accepted.id]: "plan" }));
      setServedFromBank(false);
      setPoolTopics(prev => new Set([...prev, topic]));
      if (config.language !== "sv") translateAndApplyLesson(record.lesson_id, config.language);
    } catch (e) {
      setError(`${t.error}: ${e.message}`);
      console.error(e);
    } finally {
      setLoadingChoices(false);
      setGeneratingSub(false);
    }
  };

  const generateExtra = async (lesson, kind) => {
    if (!lesson || !hasKey) return;
    const cacheKey = `${lesson.id}:${kind}`;
    if (extrasCache[cacheKey] || loadingExtras[cacheKey]) return;
    setLoadingExtras(s => ({ ...s, [cacheKey]: true }));
    try {
      const cached = await window.extrasAPI.get({ lessonId: lesson.id, kind, language: config.language });
      if (cached) { setExtrasCache(c => ({ ...c, [cacheKey]: cached })); return; }
      const result = await window.runLLM(config, window.extrasPrompt({ kind, lesson, stage, grade, subject, topic, duration, language: config.language }));
      setExtrasCache(c => ({ ...c, [cacheKey]: result }));
      const { provider, model } = currentProviderModel();
      window.extrasAPI.save({ lessonId: lesson.id, kind, language: config.language, content: result, provider, model });
    } catch (e) { setExtrasCache(c => ({ ...c, [cacheKey]: { _error: e.message } })); }
    finally { setLoadingExtras(s => { const next = { ...s }; delete next[cacheKey]; return next; }); }
  };

  const loadLessonFromBank = (id) => {
    const rec = window.bankAPI.byId(id);
    if (!rec) return;
    setStage(rec.stage); setGrade(String(rec.grade)); setSubject(rec.subject);
    setTopic(rec.topic || ""); if (rec.duration) setDuration(Number(rec.duration));
    const view = rec.lesson?.translations?.[config.language] || rec.lesson?.translations?.sv || rec.lesson;
    setAcceptedLesson({ ...view, id: rec.lesson_id, isSub: !!rec.is_sub, ctx: { teacher: ctxTeacher, className: ctxClass, day: ctxDay, time: ctxTime, room: ctxRoom } });
    setShowPoolFull(false); setShowBank(false);
    if (config.language !== "sv" && !rec.lesson?.translations?.[config.language]) translateAndApplyLesson(id, config.language);
  };

  const markLessonUsed = async () => {
    if (!acceptedLesson?.id) return { ok: false };
    window.lessonLibrary.addUsage({ lessonId: acceptedLesson.id, used: { teacher: ctxTeacher, className: ctxClass, day: ctxDay, time: ctxTime, room: ctxRoom } });
    try { await window.bankAPI.archive(null, acceptedLesson.id, config.schoolId || "school-1"); return { ok: true, synced: true }; }
    catch (e) { return { ok: true, synced: false }; }
  };

  const archiveLessonInBank = async (id) => {
    try { await window.bankAPI.archive(null, id, config.schoolId || "school-1"); } catch (e) { console.error(e); }
    if (acceptedLesson?.id === id) setAcceptedLesson(null);
  };

  const translateAndApplyLesson = async (lessonId, targetLang) => {
    if (!lessonId) return;
    const rec = window.bankAPI.byId(lessonId);
    if (!rec) return;
    const fullLesson = rec.lesson?.translations?.sv || rec.lesson;
    const { translations: _drop, ...sourceLesson } = fullLesson;
    const existing = rec.lesson?.translations?.[targetLang];
    if (existing) {
      setAcceptedLesson(prev => prev && prev.id === lessonId ? { ...existing, id: lessonId, isSub: prev.isSub, ctx: prev.ctx } : prev);
      return;
    }
    setTranslating(true);
    try {
      const result = await window.runLLM(config, window.translateLessonPrompt({ lesson: sourceLesson, targetLanguage: targetLang }));
      const cache = window.loadBankCache();
      const cached = cache.lessons.find(l => l.lesson_id === lessonId);
      if (cached) { cached.lesson = cached.lesson || {}; cached.lesson.translations = cached.lesson.translations || { sv: sourceLesson }; cached.lesson.translations[targetLang] = result; window.saveBankCache(cache); }
      setAcceptedLesson(prev => prev && prev.id === lessonId ? { ...result, id: lessonId, isSub: prev.isSub, ctx: prev.ctx } : prev);
    } catch (e) { console.error("Translate failed", e); setError(`${t.error}: ${e.message}`); }
    finally { setTranslating(false); }
  };
  translateRef.current = (id, lang) => translateAndApplyLesson(id, lang);

  const reset = () => { setAcceptedLesson(null); setError(""); setServedFromBank(false); };

  const exportMd = () => {
    const lessons = [acceptedLesson].filter(Boolean);
    const lines = [`# ${t.mdTitle}`, ``, `**${t.mdStage}:** ${stage}  `, `**${t.mdGrade}:** ${grade}  `, `**${t.mdSubject}:** ${subject}  `, `**${t.mdTopic}:** ${topic}  `, `**${t.mdDuration}:** ${duration} min  `, ``, `---`, ``];
    lessons.forEach(l => {
      lines.push(`## ${l.title}${l.isSub ? ` ☕ (${t.mdSubTag})` : ""}`);
      lines.push(`*${l.approach}*`, ``);
      if (l.summary) lines.push(l.summary, ``);
      if (l.learningGoal) lines.push(`**${t.mdLearningGoal}:** ${l.learningGoal}`);
      lines.push(``, `---`, ``);
    });
    const blob = new Blob([lines.join("\n")], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${config.language === "sv" ? "lektion" : "lesson"}-${subject}-${grade}.md`.replace(/\s+/g, "-").replace(/\//g, "-");
    a.click(); URL.revokeObjectURL(url);
  };

  const subDetailOpts = [
    { key: "quick",    label: config.language === "sv" ? "Snabb" : "Quick",    desc: config.language === "sv" ? "~1 sida — redo att skanna på 60 sek" : "~1 page — ready to scan in 60 s" },
    { key: "standard", label: config.language === "sv" ? "Standard" : "Standard", desc: config.language === "sv" ? "~2 sidor — tydliga steg + rescue-tips" : "~2 pages — clear steps + rescue tips" },
    { key: "full",     label: config.language === "sv" ? "Fullständig" : "Full", desc: config.language === "sv" ? "~3 sidor — allt inbäddat inkl. klassledning" : "~3 pages — full kit incl. class management" },
  ];

  const renderForm = () => (
    <div className="no-print" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)", padding: 24, marginBottom: 16 }}>
      <h2 style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginBottom: 16, display: "flex", alignItems: "center", gap: 6 }}>
        <Icon name="file" size={14} />
        {config.language === "sv" ? "Vikariedetaljer" : "Substitute details"}
      </h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
        <Field label={t.stage}><Select value={stage} onChange={e => setStage(e.target.value)}><option value="">{t.chooseStage}</option>{Object.keys(window.STAGES).map(s => <option key={s} value={s}>{window.localizeLabel(s, config.language)}</option>)}</Select></Field>
        <Field label={t.grade}><Select value={grade} onChange={e => setGrade(e.target.value)} disabled={!stage}><option value="">{stage ? t.chooseGrade : t.chooseStageFirst}</option>{grades.map(g => <option key={g} value={g}>{window.localizeLabel(g, config.language)}</option>)}</Select></Field>
        <Field label={t.subject}><Select value={subject} onChange={e => setSubject(e.target.value)} disabled={!stage}><option value="">{stage ? t.chooseSubject : t.chooseStageFirst}</option>{subjects.map(s => <option key={s} value={s}>{window.localizeLabel(s, config.language)}</option>)}</Select></Field>
        <Field label={t.duration}><Select value={duration} onChange={e => setDuration(Number(e.target.value))}>{[30,40,45,60,80,90,120].map(d => <option key={d} value={d}>{d} min</option>)}</Select></Field>
      </div>

      <div style={{ marginTop: 18, paddingTop: 14, borderTop: "1px dashed var(--border-default)" }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{t.contextHeader}</div>
          <div style={{ fontSize: 11, color: "var(--text-tertiary)", fontStyle: "italic" }}>{t.contextOptional}</div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
          <Field label={t.teacher}><Input value={ctxTeacher} onChange={e => setCtxTeacher(e.target.value)} placeholder="—" /></Field>
          <Field label={t.className}><Input value={ctxClass} onChange={e => setCtxClass(e.target.value)} placeholder="—" /></Field>
          <Field label={t.day}><Input value={ctxDay} onChange={e => setCtxDay(e.target.value)} placeholder="—" type="date" /></Field>
          <Field label={t.time}><Input value={ctxTime} onChange={e => setCtxTime(e.target.value)} placeholder="—" /></Field>
          <Field label={t.room}><Input value={ctxRoom} onChange={e => setCtxRoom(e.target.value)} placeholder="—" /></Field>
        </div>
      </div>

      <div style={{ marginTop: 14 }}>
        <Field label={t.topic}><Input value={topic} onChange={e => setTopic(e.target.value)} placeholder={t.topicPlaceholder} /></Field>
        {canSuggestTopics && (
          <div style={{ marginTop: 10 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8, gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{t.topicSuggestions}</span>
              {poolTopics.size > 0 && <span style={{ fontSize: 11, color: "#2E7D32", display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: "50%", background: "#4CAF50", display: "inline-block" }} />{config.language === "sv" ? "Finns i banken" : "Available in bank"}</span>}
              <button onClick={() => suggestTopics(topicSuggestions.length > 0)} disabled={loadingTopics} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 10px", fontSize: 12, fontWeight: 500, background: "transparent", color: "var(--accent)", border: "1px solid var(--border-default)", borderRadius: "var(--radius-sm)", cursor: loadingTopics ? "wait" : "pointer" }}>
                <Icon name={loadingTopics ? "refresh" : topicSuggestions.length > 0 ? "plus" : "sparkles"} size={12} style={loadingTopics ? { animation: "spin 0.8s linear infinite" } : {}} />
                {loadingTopics ? t.suggestingTopics : topicSuggestions.length > 0 ? t.moreSuggestions : t.suggestTopics}
              </button>
            </div>
            {topicSuggestions.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {topicSuggestions.map((s, i) => {
                  const selected = topic === s; const inPool = poolTopics.has(s);
                  return <button key={i} onClick={() => setTopic(s)} title={inPool ? (config.language === "sv" ? "Finns i banken — hämtas direkt!" : "Already in bank — served instantly!") : ""} style={{ padding: "6px 12px", fontSize: 12, fontWeight: 500, background: selected ? "var(--accent)" : inPool ? "#E8F5E9" : "var(--bg-surface)", color: selected ? "#fff" : inPool ? "#2E7D32" : "var(--text-primary)", border: `1px solid ${selected ? "var(--accent)" : inPool ? "#A5D6A7" : "var(--border-default)"}`, borderRadius: 999, cursor: "pointer", transition: "all 0.12s" }}>{inPool && !selected && <span style={{ marginRight: 4 }}>✓</span>}{s}</button>;
                })}
              </div>
            )}
          </div>
        )}
      </div>

      <div style={{ marginTop: 18, paddingTop: 14, borderTop: "1px dashed var(--border-default)" }}>
        <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>{t.detailLevel}</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 8 }}>
              {subDetailOpts.map(o => {
                const active = subDetailLevel === o.key;
                return <button key={o.key} onClick={() => setSubDetailLevel(o.key)} style={{ textAlign: "left", padding: "10px 12px", background: active ? "#FFF8E1" : "var(--bg-surface)", color: active ? "var(--warning-text)" : "var(--text-primary)", border: `1px solid ${active ? "var(--warning-border)" : "var(--border-default)"}`, borderRadius: "var(--radius-md)", cursor: "pointer" }}>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{o.label}</div>
                  <div style={{ fontSize: 11, color: active ? "var(--warning-text)" : "var(--text-secondary)", lineHeight: 1.4 }}>{o.desc}</div>
                </button>;
              })}
            </div>
            <div style={{ marginTop: 8, fontSize: 11, color: "var(--text-tertiary)", lineHeight: 1.5 }}>
              {config.language === "sv" ? "☕ Material: papper, pennor, tavla — inget som kräver utskrift eller förberedelse." : "☕ Materials: paper, pens, board — nothing requiring printing or prep."}
            </div>
          </div>
      </div>

      <div style={{ marginTop: 18, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        {stage && grade && subject
          ? <window.PoolIndicator stage={stage} grade={grade} subject={subject} isSub={isSub} t={t} onOpen={() => setShowPoolFull(true)} />
          : <span />}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {acceptedLesson && <Button variant="secondary" icon={<Icon name="refresh" size={14} />} onClick={reset}>{t.reset}</Button>}
          <Button
            variant="yellow"
            icon={loadingChoices ? <Icon name="refresh" size={14} style={{ animation: "spin 0.8s linear infinite" }} /> : <Icon name="coffee" size={14} />}
            onClick={generateLesson}
            disabled={!canGenerate || loadingChoices || generatingSub}>
            {loadingChoices ? (config.language === "sv" ? "Hämtar…" : "Loading…") : (config.language === "sv" ? "Skapa vikarielektion" : "Create substitute lesson")}
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh" }}>
      {/* Sub generation animation overlay */}
      {generatingSub && window.SubGenerationAnimation && <window.SubGenerationAnimation language={config.language} />}

      {showEmailPackage && acceptedLesson && window.SubEmailPackage && (
        <window.SubEmailPackage lesson={acceptedLesson} stage={stage} grade={grade} subject={subject} topic={topic} duration={duration} language={config.language} t={t} onClose={() => setShowEmailPackage(false)} />
      )}
      {showFillerBank && window.FillerBankView && (
        <window.FillerBankView config={config} onClose={() => setShowFillerBank(false)} />
      )}

      {showSettings && <window.SettingsModal config={config} onSave={saveConfig} onClose={() => setShowSettings(false)} t={t} onOpenSchoolPicker={() => setShowSchoolPicker(true)} />}
      {showSchoolPicker && <window.SchoolPickerModal t={t} currentSchoolId={config.schoolId} requireSelection={!window.schoolsAPI.all().some(s => s.school_id === config.schoolId)} onClose={() => setShowSchoolPicker(false)} onSelect={handleSelectSchool} onCreate={handleCreateSchool} />}
      {showBank && <window.BankView t={t} loading={bankLoading} error={bankError} onClose={() => setShowBank(false)} onOpen={id => loadLessonFromBank(id)} onArchive={id => archiveLessonInBank(id)} onRefresh={refreshBank} />}
      {showPoolFull && <window.PoolFullModal stage={stage} grade={grade} subject={subject} isSub={isSub} t={t} onClose={() => setShowPoolFull(false)} onOpen={id => { loadLessonFromBank(id); setShowPoolFull(false); }} onArchiveAndGenerate={async id => { try { await window.bankAPI.archive(null, id, config.schoolId || "school-1"); } catch (e) { console.error(e); } setShowPoolFull(false); setTimeout(() => generateLesson(), 0); }} />}

      <div style={{ maxWidth: 880, margin: "0 auto", padding: "32px 20px 80px" }}>
        <header className="no-print" style={{ marginBottom: 24, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 38, height: 38, background: "var(--accent)", borderRadius: "var(--radius-md)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}><Icon name="book" size={20} /></div>
            <div><h1 style={{ fontSize: 22, fontWeight: 600, lineHeight: 1.2 }}>☕ Lektionkollen</h1><p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 2 }}>{config.language === "sv" ? "Från Frånvarokollen · AI-stöd för vikarier — inga förberedelser, allt inbäddat." : "By Frånvarokollen · AI-powered substitute planning — no prep required."}</p></div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <div style={{ fontSize: 12, color: "var(--text-tertiary)", display: "flex", alignItems: "center", gap: 6 }}>
              <Icon name="key" size={12} /><span>{window.providerDisplayName(config.provider, config.language)}</span>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: hasKey ? "var(--success-text)" : "#E8C547" }} />
            </div>
            <LangToggle value={config.language} onChange={lng => saveConfig({ ...config, language: lng })} />
            {config.schoolName && <button onClick={() => setShowSchoolPicker(true)} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "6px 10px", fontSize: 12, fontWeight: 500, background: "var(--bg-secondary)", color: "var(--text-secondary)", border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)", cursor: "pointer" }}>🏫 {config.schoolName}</button>}
            <Button variant="secondary" icon={<Icon name="settings" size={14} />} onClick={() => setShowSettings(true)}>{t.apiSettings}</Button>
            <Button variant="secondary" icon={<Icon name="book" size={14} />} onClick={() => setShowBank(true)} title={t.bankTitle}>{t.bankButton} <window.SavedCountInline /></Button>
          </div>
        </header>

        <div className="no-print" style={{ display: "flex", gap: 0, marginBottom: 20, borderBottom: "2px solid var(--border-subtle)" }}>
          {[
            { key: "sub",    label: config.language === "sv" ? "☕ Vikarielektion" : "☕ Substitute Lesson" },
            { key: "filler", label: config.language === "sv" ? "⏱️ Tidsfördriv"   : "⏱️ Fillers" },
          ].map(tab => (
            <button key={tab.key} onClick={() => setPageTab(tab.key)} style={{
              padding: "10px 20px", fontSize: 13, fontWeight: 600,
              background: "transparent", border: "none",
              borderBottom: pageTab === tab.key
                ? (tab.key === "filler" ? "2px solid #C9A013" : "2px solid var(--accent)")
                : "2px solid transparent",
              marginBottom: -2,
              color: pageTab === tab.key
                ? (tab.key === "filler" ? "#7A5800" : "var(--accent)")
                : "var(--text-secondary)",
              cursor: "pointer", transition: "all 0.15s",
            }}>{tab.label}</button>
          ))}
        </div>

        {!hasKey && (
          <div className="no-print" style={{ background: "var(--warning-bg)", border: "1px solid var(--warning-border)", borderRadius: "var(--radius-md)", padding: "14px 18px", marginBottom: 20, display: "flex", alignItems: "flex-start", gap: 12 }}>
            <div style={{ color: "var(--warning-text)", flexShrink: 0, marginTop: 2 }}><Icon name="alert" size={18} /></div>
            <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 13, fontWeight: 600, color: "var(--warning-text)", marginBottom: 2 }}>{t.apiKeyMissing}</div><div style={{ fontSize: 12, color: "var(--warning-text)" }}>{t.apiKeyMissingDesc}</div></div>
            <Button variant="primary" onClick={() => setShowSettings(true)}>{t.openSettings}</Button>
          </div>
        )}

        {pageTab === "filler"
          ? (window.FillerBankView && <window.FillerBankView config={config} onClose={() => setPageTab("sub")} onLanguageChange={lng => saveConfig({ ...config, language: lng })} />)
          : renderForm()
        }

        {error && (
          <div style={{ background: "var(--danger-bg)", border: "1px solid var(--danger-text)", borderRadius: "var(--radius-md)", padding: "12px 16px", marginBottom: 16, fontSize: 13, color: "var(--danger-text)", display: "flex", gap: 10 }}>
            <Icon name="alert" size={16} /><span>{error}</span>
          </div>
        )}

        {acceptedLesson && pageTab !== "filler" && (
          <LessonErrorBoundary>
          <div style={{ marginBottom: 16 }}>
            <div className="no-print" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, gap: 8, flexWrap: "wrap" }}>
              <h2 style={{ fontSize: 16, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
                ☕ {config.language === "sv" ? "Din vikarielektion" : "Your substitute lesson"}
                {servedFromBank && <span style={{ fontSize: 11, fontWeight: 500, color: "#2E7D32", background: "#E8F5E9", padding: "2px 8px", borderRadius: 999, border: "1px solid #A5D6A7" }}>✓ {config.language === "sv" ? "Från banken" : "From bank"}</span>}
                {translating && <span style={{ fontSize: 11, fontWeight: 500, color: "var(--text-tertiary)", display: "inline-flex", alignItems: "center", gap: 4 }}><Icon name="refresh" size={11} style={{ animation: "spin 0.8s linear infinite" }} /> {t.translating}</span>}
              </h2>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {LangToggle && <LangToggle value={config.language} onChange={lng => saveConfig({ ...config, language: lng })} />}
                <Button variant="ghost" icon={<Icon name="refresh" size={13} />} onClick={generateLesson}>{t.addAnother}</Button>
                <Button variant="ghost" icon={<Icon name="print" size={13} />} onClick={() => window.print()}>{t.print}</Button>
                <Button variant="ghost" icon={<Icon name="download" size={13} />} onClick={exportMd}>{t.download}</Button>
                {acceptedLesson && acceptedLesson.isSub && (
                  <Button variant="yellow" icon={<span style={{fontSize:12}}>✉️</span>} onClick={() => setShowEmailPackage(true)}>
                    {config.language === "sv" ? "Skicka till vikarie" : "Send to sub"}
                  </Button>
                )}
              </div>
            </div>

            {!acceptedLesson.isSub && (
              <div className="no-print" style={{ marginBottom: 12, padding: "10px 14px", background: "var(--bg-secondary)", borderRadius: "var(--radius-md)", border: "1px solid var(--border-subtle)", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>{config.language === "sv" ? "Betygsätt:" : "Rate:"}</span>
                <window.RatingWidget lessonId={acceptedLesson.id} schoolId={config.schoolId} existingAvg={window.bankAPI.byId(acceptedLesson.id)?._avgRating ?? null} ratingCount={window.bankAPI.byId(acceptedLesson.id)?._ratingCount ?? 0} />
              </div>
            )}

            <window.LessonCardWithTabs
              lesson={acceptedLesson} t={t} language={config.language}
              extrasEnabled={acceptedLesson.isSub ? {} : extrasEnabled}
              extrasCache={extrasCache} loadingExtras={loadingExtras}
              onGenerateExtra={kind => generateExtra(acceptedLesson, kind)}
              onForceRegenerate={kind => { const k = `${acceptedLesson.id}:${kind}`; setExtrasCache(c => { const n = { ...c }; delete n[k]; return n; }); generateExtra(acceptedLesson, kind); }}
              activeTab={activeTab[acceptedLesson.id] || "plan"}
              setActiveTab={tab => setActiveTab(s => ({ ...s, [acceptedLesson.id]: tab }))}
              onMarkUsed={markLessonUsed}
              onSubmitFeedback={null}
            />
          </div>
          </LessonErrorBoundary>
        )}

        <div className="no-print" style={{ marginTop: 40, fontSize: 11, color: "var(--text-tertiary)", textAlign: "center", lineHeight: 1.6 }}>{t.print_warning}</div>
      </div>

      <AppVersionBadgeMount providerLabel={window.providerDisplayName(config.provider, config.language)} onOpenLibrary={() => setShowBank(true)} />
    </div>
  );
}

function AppVersionBadgeMount({ providerLabel, onOpenLibrary }) {
  window.useBankVersion();
  const savedCount = window.bankAPI.active().length;
  return <window.VersionBadge providerLabel={providerLabel} savedCount={savedCount} onOpenLibrary={onOpenLibrary} />;
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
