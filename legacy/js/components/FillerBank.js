// ============================================================
// FillerBank — standalone sub time-filler activity bank.
// Categories: curriculum subjects + general (GK, nature, space, etc.)
// Pool of 3 per (year-band × category), rated 1-10, top rises.
// Subs can browse and email any filler activity.
// Depends on: Icon.js, bankAPI.js, storage.js, api.js, prompts (fillerPrompt)
// ============================================================

const { useState: useState_filler, useEffect: useEffect_filler, useMemo: useMemo_filler } = React;

// ── Category definitions ──────────────────────────────────────────────────

window.FILLER_YEAR_BANDS = [
  { key: "F-3",  label: { sv: "F-3 (Lågstadiet)",  en: "F-3 (Lower primary)"  } },
  { key: "4-6",  label: { sv: "4-6 (Mellanstadiet)", en: "4-6 (Middle primary)"  } },
  { key: "7-9",  label: { sv: "7-9 (Högstadiet)",   en: "7-9 (Lower secondary)" } },
  { key: "Gym",  label: { sv: "Gymnasiet",           en: "Upper secondary"       } },
];

window.FILLER_CATEGORIES = [
  // ── Lgr22 subjects ──
  { key: "svenska",     label: { sv: "Svenska",           en: "Swedish"             }, emoji: "📝" },
  { key: "engelska",    label: { sv: "Engelska",          en: "English"             }, emoji: "🇬🇧" },
  { key: "matematik",   label: { sv: "Matematik",         en: "Mathematics"         }, emoji: "🔢" },
  { key: "biologi",     label: { sv: "Biologi",           en: "Biology"             }, emoji: "🌿" },
  { key: "kemi",        label: { sv: "Kemi",              en: "Chemistry"           }, emoji: "⚗️" },
  { key: "fysik",       label: { sv: "Fysik",             en: "Physics"             }, emoji: "⚡" },
  { key: "teknik",      label: { sv: "Teknik",            en: "Technology"          }, emoji: "⚙️" },
  { key: "historia",    label: { sv: "Historia",          en: "History"             }, emoji: "📜" },
  { key: "geografi",    label: { sv: "Geografi",          en: "Geography"           }, emoji: "🗺️" },
  { key: "samhalle",    label: { sv: "Samhällskunskap",   en: "Civics"              }, emoji: "🏛️" },
  { key: "religion",    label: { sv: "Religionskunskap",  en: "RE"                  }, emoji: "☮️" },
  { key: "bild",        label: { sv: "Bild",              en: "Art"                 }, emoji: "🎨" },
  { key: "musik",       label: { sv: "Musik",             en: "Music"               }, emoji: "🎵" },
  { key: "idrott",      label: { sv: "Idrott & hälsa",   en: "PE & Health"         }, emoji: "🏃" },
  { key: "hkk",         label: { sv: "Hem & konsument",  en: "Home economics"      }, emoji: "🍳" },
  // ── Cross-curricular / fun ──
  { key: "logik",       label: { sv: "Logik & pussel",   en: "Logic & puzzles"     }, emoji: "🧩" },
  { key: "ordlekar",    label: { sv: "Ordlekar",         en: "Word games"          }, emoji: "🔤" },
  { key: "tanke",       label: { sv: "Tankeexperiment",  en: "Thought experiments" }, emoji: "🤔" },
  { key: "rymden",      label: { sv: "Rymden",           en: "Space"               }, emoji: "🚀" },
  { key: "djur",        label: { sv: "Djur & natur",     en: "Animals & nature"    }, emoji: "🦋" },
  { key: "lander",      label: { sv: "Länder & flaggor", en: "Countries & flags"   }, emoji: "🏳️" },
  { key: "sport",       label: { sv: "Sport & rekord",   en: "Sport & records"     }, emoji: "🏆" },
  { key: "uppfinningar",label: { sv: "Uppfinningar",     en: "Inventions"          }, emoji: "💡" },
  { key: "mat",         label: { sv: "Mat & kulturer",   en: "Food & cultures"     }, emoji: "🍜" },
  { key: "internet",    label: { sv: "Digital värld",    en: "Digital world"       }, emoji: "💻" },
  { key: "magi",        label: { sv: "Magi & illusioner",en: "Magic & illusions"   }, emoji: "🎩" },
  { key: "allmant",     label: { sv: "Allmänbildning",   en: "General knowledge"   }, emoji: "🧠" },
];

// ── Supabase helpers (reuse pattern from bankAPI) ────────────────────────
const FILLER_POOL_LIMIT = 5;

function _fbUrl(query = "") {
  return `${window.SUPABASE_URL}/rest/v1/filler_activities${query ? `?${query}` : ""}`;
}
function _fbHeaders(extra = {}) {
  return { "Content-Type": "application/json", "apikey": window.SUPABASE_ANON_KEY, "Authorization": `Bearer ${window.SUPABASE_ANON_KEY}`, "Prefer": "return=representation", ...extra };
}
async function _fbGet(query = "") {
  const r = await fetch(_fbUrl(query), { headers: _fbHeaders() });
  if (!r.ok) throw new Error(`Filler GET failed: ${r.status} ${await r.text()}`);
  return r.json();
}
async function _fbPost(body) {
  const r = await fetch(_fbUrl(), { method: "POST", headers: _fbHeaders(), body: JSON.stringify(body) });
  if (!r.ok) throw new Error(`Filler POST failed: ${r.status} ${await r.text()}`);
  return r.json();
}
async function _fbPatch(query, body) {
  const r = await fetch(_fbUrl(query), { method: "PATCH", headers: _fbHeaders(), body: JSON.stringify(body) });
  if (!r.ok) throw new Error(`Filler PATCH failed: ${r.status} ${await r.text()}`);
  return r.json();
}
async function _fbDelete(query) {
  const r = await fetch(_fbUrl(query), { method: "DELETE", headers: _fbHeaders() });
  if (!r.ok) throw new Error(`Filler DELETE failed: ${r.status} ${await r.text()}`);
}

// ── Local cache ───────────────────────────────────────────────────────────
const FILLER_CACHE_KEY = "lektionsplaneraren-filler-cache-v1";

function loadFillerCache() {
  try { const r = localStorage.getItem(FILLER_CACHE_KEY); return r ? JSON.parse(r) : { activities: [], fetchedAt: 0 }; }
  catch { return { activities: [], fetchedAt: 0 }; }
}
function saveFillerCache(data) {
  try { localStorage.setItem(FILLER_CACHE_KEY, JSON.stringify(data)); window.dispatchEvent(new Event("lp-filler-change")); }
  catch(e) { console.error("Filler cache save failed", e); }
}

// ── fillerAPI ─────────────────────────────────────────────────────────────
window.fillerAPI = {
  all()    { return loadFillerCache().activities || []; },
  active() { return this.all().filter(a => a.status === "active"); },
  getPool({ yearBand, category }) {
    return this.active()
      .filter(a => a.year_band === yearBand && a.category === category)
      .sort((a, b) => (b._avgRating ?? 0) - (a._avgRating ?? 0))
      .slice(0, FILLER_POOL_LIMIT);
  },
  cacheUpsert(item) {
    const cache = loadFillerCache();
    const idx = cache.activities.findIndex(a => a.filler_id === item.filler_id);
    if (idx >= 0) cache.activities[idx] = item;
    else cache.activities.push(item);
    saveFillerCache(cache);
    window.dispatchEvent(new Event("lp-filler-change"));
  },

  async refresh() {
    try {
      const rows = await _fbGet("status=eq.active&order=created_at.desc");
      const mapped = rows.map(r => {
        let act = r.activity_json || r.activity || {};
        if (typeof act === "string") { try { act = JSON.parse(act); } catch(e) {} }
        return { ...r, activity: act };
      });
      saveFillerCache({ activities: mapped, fetchedAt: Date.now() });
      window.dispatchEvent(new Event("lp-filler-change"));
      return mapped;
    } catch(e) { console.warn("Filler refresh failed (table may not exist yet):", e.message); return []; }
  },

  async add({ yearBand, category, language, activity, provider, model }) {
    // Check pool first
    const pool = await _fbGet(`year_band=eq.${encodeURIComponent(yearBand)}&category=eq.${encodeURIComponent(category)}&status=eq.active&select=filler_id`);
    if (pool.length >= FILLER_POOL_LIMIT) {
      const err = new Error("pool_full"); err.code = "pool_full"; throw err;
    }
    const [created] = await _fbPost({ year_band: yearBand, category, language, activity_json: activity, provider, model, status: "active" });
    const item = { ...created, activity: activity };
    this.cacheUpsert(item);
    return item;
  },

  async rate({ fillerId, rating }) {
    const clamped = Math.min(10, Math.max(1, Math.round(rating)));
    await _fbPost({ filler_id: fillerId, rating: clamped });
    const cache = loadFillerCache();
    const rec = cache.activities.find(a => a.filler_id === fillerId);
    if (rec) {
      rec._ratings = [...(rec._ratings || []), clamped];
      rec._avgRating = rec._ratings.reduce((a, b) => a + b, 0) / rec._ratings.length;
      rec._ratingCount = rec._ratings.length;
      saveFillerCache(cache);
    }
  },

  async archive(fillerId) {
    await _fbPatch(`filler_id=eq.${fillerId}`, { status: "archived" });
    const cache = loadFillerCache();
    cache.activities = cache.activities.filter(a => a.filler_id !== fillerId);
    saveFillerCache(cache);
    window.dispatchEvent(new Event("lp-filler-change"));
  },

  async deletePermanently(fillerId) {
    await _fbDelete(`filler_id=eq.${fillerId}`);
    const cache = loadFillerCache();
    cache.activities = cache.activities.filter(a => a.filler_id !== fillerId);
    saveFillerCache(cache);
    window.dispatchEvent(new Event("lp-filler-change"));
  },
};

// ── Filler generation prompt ───────────────────────────────────────────────
window.fillerPrompt = function fillerPrompt({ yearBand, category, language, existingTitles = [] }) {
  const cat = window.FILLER_CATEGORIES.find(c => c.key === category);
  const catLabel = cat ? (language === "en" ? cat.label.en : cat.label.sv) : category;
  const ybLabel  = yearBand;
  const isEn = language === "en";
  const avoidBlock = existingTitles.length > 0
    ? `\nVIKTIGT: Dessa aktiviteter finns redan — skapa något helt annorlunda, annan vinkel, annat format:\n${existingTitles.map((t, i) => `${i+1}. "${t}"`).join("\n")}\n`
    : "";


  return `${avoidBlock}Du skapar en TIDSFÖRDRIV-AKTIVITET för en vikarie. Aktiviteten ska:
- Ta 10-20 minuter
- Kräva NOLL förberedelse — papper, pennor och tavla är det enda tillåtna
- Vara rolig, engagerande och pedagogisk
- Fungera utan att vikarien har ämneskunskap
- Passa: Årskurser/nivå ${ybLabel} · Kategori: ${catLabel}
- Ha ALLT material inbäddat (alla frågor, facit, instruktioner — inget lämnas åt vikarien att hitta på)
- Vara lagom utmanande — eleverna ska lyckas men behöva anstränga sig

FORMAT: Välj ETT av dessa format som passar kategorin bäst:
• Quiz (5-8 frågor med alternativ, facit, bonusrundar)
• Tankepussel (ett problem eller gåta med steg-för-steg lösning)
• Ordspel / skrivövning (konkret uppgift med exempelvar)
• Diskussion (3-4 provocerande frågor med "lyssna-efter" svar)
• Ritövning / kreativt (tydliga steg, inget konstnärligt kunnande krävs)
• Tävling (par eller grupp, poängsystem, facit)

Svara ENDAST med giltigt JSON, ingen markdown:
{
  "title": "catchy titel (max 8 ord)",
  "format": "quiz|pussel|ordspel|diskussion|kreativt|tävling",
  "duration": "10-15 min",
  "summary": "En mening: vad gör eleverna och varför är det kul",
  "teacherIntro": "Exakt vad vikarien säger för att introducera aktiviteten (2-3 meningar, entusiastisk ton)",
  "instructions": [
    "Numrerat steg 1",
    "Numrerat steg 2",
    "Numrerat steg 3"
  ],
  "content": {
    "items": [
      { "q": "Fråga/uppgift/påstående", "a": "Svar/facit", "note": "Extra info eller bonusfakta (valfritt)" }
    ]
  },
  "boardText": "VERBATIM vad vikarien skriver på tavlan (titel + eventuella regler/poängsystem). \\n för radbrytningar.",
  "wrapUp": "Hur vikarien avslutar aktiviteten (1-2 meningar, inkl. hur man kårar vinnare om relevant)",
  "funFact": "En överraskande och rolig faktoid kopplad till temat (1 mening)"
}`;
};

// ── React hook for filler cache ──────────────────────────────────────────
window.useFillerVersion = function useFillerVersion() {
  const [tick, setTick] = useState_filler(0);
  useEffect_filler(() => {
    const onChange = () => setTick(t => t + 1);
    window.addEventListener("lp-filler-change", onChange);
    return () => window.removeEventListener("lp-filler-change", onChange);
  }, []);
  return tick;
};

// ── Translate activity fields SV→EN on the fly ────────────────────────────
// v2: stronger translation prompt + nested-array validation. Bumping invalidates
// stale partials cached under the old prompt (which left arrays untranslated).
const TRANSLATE_CACHE_KEY = "lp-filler-translations-v2";

function loadTranslateCache() {
  try { return JSON.parse(localStorage.getItem(TRANSLATE_CACHE_KEY) || "{}"); }
  catch(e) { return {}; }
}
function saveTranslateCache(cache) {
  try { localStorage.setItem(TRANSLATE_CACHE_KEY, JSON.stringify(cache)); }
  catch(e) {}
}

async function translateActivity(act, config) {
  if (!act || !act.title) return act;
  // Cache key: prefer stable filler_id-style hash; fall back to full title.
  // (Old slice(0,30) caused collisions and stale-translation bleed-through.)
  const cacheKey = act._cacheKey || act.title;
  const cache = loadTranslateCache();
  if (cache[cacheKey]) return cache[cacheKey];

  const fields = {
    title: act.title,
    format: act.format,
    summary: act.summary,
    teacherIntro: act.teacherIntro,
    instructions: Array.isArray(act.instructions) ? act.instructions : [],
    boardText: act.boardText,
    wrapUp: act.wrapUp,
    funFact: act.funFact,
    content: act.content && typeof act.content === "object"
      ? { items: Array.isArray(act.content.items) ? act.content.items : [] }
      : { items: [] },
  };

  const prompt = `You are translating a Swedish classroom activity JSON to natural, fluent English for a substitute teacher.

CRITICAL RULES:
1. Output ONLY valid JSON — no markdown, no \`\`\` fences, no commentary.
2. Preserve the EXACT structure and keys. Do NOT translate keys.
3. Translate EVERY string VALUE, including nested ones:
   - "instructions" is an ARRAY of strings — translate each element.
   - "content.items" is an ARRAY of objects with "q", "a", and optional "note" — translate q, a, AND note for every item.
   - "boardText" may contain \\n line breaks — preserve them, translate the text around them.
4. For "format" field, translate Swedish format names: "quiz"→"quiz", "pussel"→"puzzle", "ordspel"→"word game", "diskussion"→"discussion", "kreativt"→"creative", "tävling"→"competition".
5. Translate naturally — full sentences, not word-for-word. Keep the same tone (enthusiastic, kid-friendly).
6. Numbers, names, and proper nouns stay unchanged.

JSON TO TRANSLATE:
${JSON.stringify(fields, null, 2)}`;

  try {
    const raw = await window.runLLM(config, prompt);
    const clean = (typeof raw === "string")
      ? raw.replace(/^\`\`\`json\s*/i, "").replace(/^\`\`\`\s*/i, "").replace(/\`\`\`\s*$/, "").trim()
      : raw;
    const translated = typeof clean === "string" ? JSON.parse(clean) : clean;

    // Validate: did the LLM actually translate the nested arrays?
    const instructionsOk = !fields.instructions.length
      || (Array.isArray(translated.instructions) && translated.instructions.length === fields.instructions.length);
    const contentOk = !fields.content.items.length
      || (translated.content?.items?.length === fields.content.items.length);
    if (!instructionsOk || !contentOk) {
      console.warn("Filler translation incomplete — nested arrays missing items", {
        expected: { instructions: fields.instructions.length, items: fields.content.items.length },
        got: { instructions: translated.instructions?.length, items: translated.content?.items?.length },
      });
    }

    const result = { ...act, ...translated };
    cache[cacheKey] = result;
    saveTranslateCache(cache);
    return result;
  } catch(e) {
    console.warn("Filler translation failed:", e.message, e);
    return act; // fall back to Swedish
  }
}


// ── FillerRatingWidget ────────────────────────────────────────────────────
function FillerRating({ fillerId, existingAvg, ratingCount }) {
  const [hovered, setHovered] = useState_filler(null);
  const [submitted, setSubmitted] = useState_filler(false);
  const [saving, setSaving] = useState_filler(false);

  const handleRate = async (val) => {
    if (saving || submitted) return;
    setSaving(true);
    try { await window.fillerAPI.rate({ fillerId, rating: val }); setSubmitted(true); }
    catch(e) { console.error("Rate failed", e); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
      {Array.from({ length: 10 }, (_, i) => i + 1).map(n => {
        const active = hovered != null ? n <= hovered : (submitted && existingAvg && n <= Math.round(existingAvg));
        return (
          <button key={n} onMouseEnter={() => !submitted && setHovered(n)} onMouseLeave={() => !submitted && setHovered(null)}
            onClick={() => handleRate(n)} disabled={saving || submitted}
            style={{ width: 20, height: 20, border: "none", borderRadius: 3, cursor: submitted ? "default" : "pointer", fontSize: 10, fontWeight: 600, background: active ? "#C9A013" : "var(--bg-secondary)", color: active ? "#fff" : "var(--text-tertiary)", transition: "all 0.1s" }}>
            {n}
          </button>
        );
      })}
      {existingAvg != null && <span style={{ fontSize: 10, color: "var(--text-tertiary)" }}>⌀{existingAvg.toFixed(1)} ({ratingCount})</span>}
      {submitted && <span style={{ fontSize: 10, color: "var(--success-text)", fontWeight: 500 }}>✓</span>}
    </div>
  );
}

// ── FillerCard ────────────────────────────────────────────────────────────
function FillerCard({ item, language, config, onEmail, onArchive, onDelete, onToggleLang }) {
  const [expanded, setExpanded] = useState_filler(false);
  const [translating, setTranslating] = useState_filler(false);
  const [translatedAct, setTranslatedAct] = useState_filler(null);
  const [archiving, setArchiving] = useState_filler(false);
  const [confirmDelete, setConfirmDelete] = useState_filler(false);

  let baseAct = item.activity || item.activity_json || {};
  if (typeof baseAct === "string") { try { baseAct = JSON.parse(baseAct); } catch(e) { baseAct = {}; } }

  // Translate on demand when EN is selected
  useEffect_filler(() => {
    if (language !== "en" || !baseAct.title || !config) { setTranslatedAct(null); return; }
    setTranslating(true);
    translateActivity(baseAct, config)
      .then(t => setTranslatedAct(t))
      .finally(() => setTranslating(false));
  }, [language, item.filler_id]);

  const act = (language === "en" && translatedAct) ? translatedAct : baseAct;
  const isSv = language !== "en";

  return (
    <div style={{ border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)", overflow: "hidden", background: "var(--bg-surface)" }}>
      {/* Card header */}
      <div style={{ padding: "12px 14px", background: item._avgRating >= 8 ? "#FFFDE7" : "var(--bg-surface)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 3 }}>
              {act.format} · {act.duration}
              {item._avgRating >= 8 && <span style={{ marginLeft: 6, color: "#C9A013" }}>⭐ Top rated</span>}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
              <span style={{ fontSize: 14, fontWeight: 600 }}>{act.title}{translating ? <span style={{ fontSize: 10, color: "var(--text-tertiary)", marginLeft: 6, fontWeight: 400 }}>translating…</span> : null}</span>
              {onToggleLang && window.LangToggle && (
                <window.LangToggle value={language} onChange={onToggleLang} />
              )}
            </div>
            <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.4 }}>{act.summary}</div>
          </div>
          <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
            {onEmail && (
              <button onClick={() => onEmail(item)} title={isSv ? "Skicka till vikarie" : "Email to sub"} style={{ ...window.smallBtn, padding: "4px 8px", fontSize: 11 }}>✉️</button>
            )}
            <button
              onClick={async () => { setArchiving(true); try { if (onArchive) await onArchive(item.filler_id); } finally { setArchiving(false); } }}
              title={isSv ? "Arkivera (dölj från pool)" : "Archive (hide from pool)"}
              style={{ ...window.smallBtn, padding: "4px 8px", fontSize: 11, opacity: archiving ? 0.5 : 1 }}
            >{archiving ? "…" : "📦"}</button>
            <button onClick={() => setExpanded(e => !e)} style={{ ...window.smallBtn, padding: "4px 8px", fontSize: 11 }}>
              {expanded ? (isSv ? "Dölj" : "Hide") : (isSv ? "Visa" : "View")} {expanded ? "▴" : "▾"}
            </button>
          </div>
        </div>
        <div style={{ marginTop: 8 }}>
          <FillerRating fillerId={item.filler_id} existingAvg={item._avgRating ?? null} ratingCount={item._ratingCount ?? 0} />
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div style={{ padding: "12px 14px", borderTop: "1px solid var(--border-subtle)", display: "flex", flexDirection: "column", gap: 10 }}>

          {/* Board text */}
          {act.boardText && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 4 }}>
                {isSv ? "📋 Tavlan" : "📋 Board"}
              </div>
              <div style={{ background: "#F8F4EB", border: "1px dashed #C9A013", borderRadius: "var(--radius-sm)", padding: "8px 10px", fontSize: 12, fontFamily: "ui-monospace, Menlo, monospace", whiteSpace: "pre-wrap" }}>
                {act.boardText}
              </div>
            </div>
          )}

          {/* Intro */}
          {act.teacherIntro && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 4 }}>
                {isSv ? "💬 Introduktion" : "💬 Introduction"}
              </div>
              <div style={{ fontSize: 13, fontStyle: "italic", color: "var(--text-primary)", padding: "6px 10px", background: "var(--accent-bg)", borderRadius: "var(--radius-sm)" }}>
                "{act.teacherIntro}"
              </div>
            </div>
          )}

          {/* Instructions */}
          {act.instructions && act.instructions.length > 0 && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 4 }}>
                {isSv ? "Steg" : "Steps"}
              </div>
              <ol style={{ fontSize: 13, lineHeight: 1.55, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 4, margin: 0 }}>
                {act.instructions.map((s, i) => <li key={i}>{String(s).replace(/^\d+\.\s*/, "")}</li>)}
              </ol>
            </div>
          )}

          {/* Content items */}
          {act.content?.items && act.content.items.length > 0 && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6 }}>
                {isSv ? "Frågor/Uppgifter + Facit" : "Questions/Tasks + Answers"}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {act.content.items.map((item, i) => (
                  <div key={i} style={{ background: "var(--bg-secondary)", borderRadius: "var(--radius-sm)", padding: "8px 10px" }}>
                    <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 3 }}>
                      {i + 1}. {item.q}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--success-text)" }}>✓ {item.a}</div>
                    {item.note && <div style={{ fontSize: 11, color: "var(--text-tertiary)", fontStyle: "italic", marginTop: 2 }}>💡 {item.note}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Wrap-up */}
          {act.wrapUp && (
            <div style={{ fontSize: 12, color: "var(--text-secondary)", padding: "6px 10px", background: "var(--bg-secondary)", borderRadius: "var(--radius-sm)" }}>
              <strong>{isSv ? "Avslutning: " : "Wrap-up: "}</strong>{act.wrapUp}
            </div>
          )}

          {/* Fun fact */}
          {act.funFact && (
            <div style={{ fontSize: 12, color: "#6B5410", background: "#FFF8E1", padding: "6px 10px", borderRadius: "var(--radius-sm)" }}>
              🌟 {act.funFact}
            </div>
          )}
          <div style={{ marginTop: 16, paddingTop: 12, borderTop: "1px solid var(--border-subtle)", display: "flex", justifyContent: "flex-end" }}>
            {!confirmDelete
              ? <button onClick={() => setConfirmDelete(true)} style={{ fontSize: 11, color: "var(--danger-text)", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>
                  {isSv ? "🗑 Ta bort permanent" : "🗑 Delete permanently"}
                </button>
              : <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{ fontSize: 11, color: "var(--danger-text)" }}>{isSv ? "Är du säker?" : "Are you sure?"}</span>
                  <button onClick={async () => { if (onDelete) await onDelete(item.filler_id); setConfirmDelete(false); }} style={{ fontSize: 11, padding: "3px 10px", background: "var(--danger-text)", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer" }}>
                    {isSv ? "Ja, radera" : "Yes, delete"}
                  </button>
                  <button onClick={() => setConfirmDelete(false)} style={{ fontSize: 11, padding: "3px 8px", background: "var(--bg-secondary)", border: "1px solid var(--border-default)", borderRadius: 4, cursor: "pointer" }}>
                    {isSv ? "Avbryt" : "Cancel"}
                  </button>
                </div>
            }
          </div>
        </div>
      )}
    </div>
  );
}

// ── FillerEmailModal ──────────────────────────────────────────────────────
function FillerEmailModal({ item, language, onClose }) {
  const [subEmail, setSubEmail] = useState_filler("");
  const [copied, setCopied] = useState_filler(false);
  const isSv = language !== "en";
  const act = item?.activity || {};

  const body = useMemo_filler(() => {
    if (!act.title) return "";
    const lines = [];
    lines.push(isSv ? "Hej!" : "Hi!");
    lines.push("");
    lines.push(isSv ? "Här är en extra aktivitet om du behöver fylla ut tid:" : "Here is a spare-time activity if you need to fill time:");
    lines.push("");
    lines.push("═".repeat(50));
    lines.push(`${act.title}  [${act.duration}]`);
    lines.push("═".repeat(50));
    lines.push(act.summary || "");
    lines.push("");
    if (act.boardText) {
      lines.push(isSv ? "TAVLAN:" : "BOARD:");
      act.boardText.split(/\\n|\n/).forEach(l => lines.push("  " + l));
      lines.push("");
    }
    if (act.teacherIntro) {
      lines.push(isSv ? "SÄTT IGÅNG (säg detta):" : "START (say this):");
      lines.push(`"${act.teacherIntro}"`);
      lines.push("");
    }
    if (act.instructions?.length) {
      lines.push(isSv ? "INSTRUKTIONER:" : "INSTRUCTIONS:");
      act.instructions.forEach((s, i) => lines.push(`${i + 1}. ${String(s).replace(/^\d+\.\s*/, "")}`));
      lines.push("");
    }
    if (act.content?.items?.length) {
      lines.push(isSv ? "FRÅGOR + FACIT:" : "QUESTIONS + ANSWERS:");
      act.content.items.forEach((it, i) => {
        lines.push(`${i + 1}. ${it.q}`);
        lines.push(`   ✓ ${it.a}`);
        if (it.note) lines.push(`   💡 ${it.note}`);
      });
      lines.push("");
    }
    if (act.wrapUp) { lines.push(isSv ? "AVSLUTNING:" : "WRAP-UP:"); lines.push(act.wrapUp); lines.push(""); }
    if (act.funFact) { lines.push(`🌟 ${act.funFact}`); lines.push(""); }
    return lines.join("\n");
  }, [item, isSv]);

  const subject = `${isSv ? "Extra aktivitet" : "Spare-time activity"}: ${act.title}`;
  const mailtoHref = `mailto:${encodeURIComponent(subEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "var(--bg-surface)", borderRadius: "var(--radius-lg)", maxWidth: 440, width: "100%", padding: 22 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600 }}>✉️ {isSv ? "Skicka till vikarie" : "Send to sub"}</h3>
          <button onClick={onClose} style={{ background: "transparent", border: "none", fontSize: 18, cursor: "pointer", color: "var(--text-tertiary)" }}>×</button>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>{isSv ? "Vikariets e-post" : "Sub's email"}</label>
          <input value={subEmail} onChange={e => setSubEmail(e.target.value)} placeholder="vikarie@skola.se" type="email"
            style={{ width: "100%", padding: "7px 10px", fontSize: 13, border: "1px solid var(--border-default)", borderRadius: "var(--radius-sm)", background: "var(--bg-surface)", color: "var(--text-primary)" }} />
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => { navigator.clipboard.writeText(body); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
            style={{ flex: 1, padding: "9px", fontSize: 12, fontWeight: 600, background: copied ? "var(--success-bg)" : "var(--bg-secondary)", color: copied ? "var(--success-text)" : "var(--text-primary)", border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)", cursor: "pointer" }}>
            {copied ? "✓ " : "📋 "}{isSv ? "Kopiera" : "Copy"}
          </button>
          <a href={mailtoHref} style={{ flex: 2, padding: "9px", fontSize: 12, fontWeight: 600, background: "#F5C518", color: "#3A2C00", border: "1px solid #C9A013", borderRadius: "var(--radius-md)", textDecoration: "none", textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
            ✉️ {isSv ? "Öppna i mejl" : "Open in email"}
          </a>
        </div>
      </div>
    </div>
  );
}

// ── Main FillerBankView ───────────────────────────────────────────────────
// Inject dot-pulse keyframes for the filler generation animation
(function() {
  if (!document.getElementById("filler-keyframes")) {
    const s = document.createElement("style");
    s.id = "filler-keyframes";
    s.textContent = `@keyframes dot-pulse { 0%,80%,100%{transform:scale(0.6);opacity:0.4} 40%{transform:scale(1);opacity:1} }`;
    document.head.appendChild(s);
  }
})();


window.FillerBankView = function FillerBankView({ config, onClose, onLanguageChange }) {
  const language  = config?.language || "sv";
  const isSv      = language !== "en";

  const [category,   setCategory]   = useState_filler("");
  const [generating, setGenerating] = useState_filler(false);
  const [showAnim,   setShowAnim]   = useState_filler(false);
  const [error,      setError]      = useState_filler("");
  const [emailItem,  setEmailItem]  = useState_filler(null);
  const [refreshing, setRefreshing] = useState_filler(false);

  // Pick a sensible default year band from the lesson context — or just F-3
  const yearBand = "all";   // we use "all" as a signal to show across bands
  const TOP_N = 5;

  useEffect_filler(() => {
    setRefreshing(true);
    window.fillerAPI.refresh().finally(() => setRefreshing(false));
  }, []);

  const hasKey = config && (
    (config.provider === "gemini"    && config.geminiKey)    ||
    (config.provider === "anthropic" && config.anthropicKey) ||
    (config.provider === "openai"    && config.openaiKey)    ||
    (config.provider === "grok"      && config.grokKey)      ||
    (config.provider === "local"     && config.localUrl)
  );

  // Get top-N activities for selected category across all year bands
  const tick = window.useFillerVersion();
  const pool = useMemo_filler(() => {
    if (!category) return [];
    const all = window.fillerAPI.all().filter(a => a.category === category && a.status === "active");
    // sort by avg rating desc, then newest
    return all
      .sort((a, b) => (b._avgRating || 0) - (a._avgRating || 0) || new Date(b.created_at) - new Date(a.created_at))
      .slice(0, TOP_N);
  }, [category, tick]);

  const currentProviderModel = () => {
    const p = config?.provider;
    const m = { gemini: config?.geminiModel, anthropic: config?.anthropicModel, openai: config?.openaiModel, grok: config?.grokModel, local: config?.localModel };
    return { provider: p, model: m[p] || "" };
  };

  const generate = async () => {
    if (!category || !hasKey || generating) return;
    setError(""); setGenerating(true); setShowAnim(true);
    // pick the most relevant year band based on what's already in the pool or default
    const yb = window.FILLER_YEAR_BANDS[1].key; // default 4-6
    try {
      const existingTitles = window.fillerAPI.all()
        .filter(a => a.category === category && a.status === "active")
        .map(a => { const act = a.activity || a.activity_json || {}; return (typeof act === "object" ? act.title : null); })
        .filter(Boolean);
      const prompt = window.fillerPrompt({ yearBand: yb, category, language, existingTitles });
      const raw = await window.runLLM(config, prompt);
      // Strip markdown fences if present, then parse JSON
      const clean = (typeof raw === "string")
        ? raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/,"").trim()
        : raw;
      let activity;
      try { activity = (typeof clean === "string") ? JSON.parse(clean) : clean; }
      catch(parseErr) { throw new Error("AI response was not valid JSON: " + String(clean).slice(0, 120)); }
      const { provider, model } = currentProviderModel();
      await window.fillerAPI.add({ yearBand: yb, category, language, activity, provider, model });
      // Sync from Supabase to get the canonical record
      await window.fillerAPI.refresh();
    } catch(e) {
      setError(String(e.message || e));
    } finally {
      setGenerating(false); setShowAnim(false);
    }
  };

  const catLabel = (c) => language === "en" ? c.label.en : c.label.sv;

  return (
    <div style={{ padding: "0 0 40px" }}>

      {/* Subheader */}
      <div style={{ padding: "14px 0 18px", borderBottom: "1px solid var(--border-subtle)", marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
        <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: 0 }}>
          {isSv
            ? "Engagerande 10-20 min aktiviteter för vikarier — inga förberedelser, allt inbäddat."
            : "Engaging 10–20 min activities for substitutes — no prep, everything embedded."}
        </p>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {refreshing && <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>…</span>}
          <button onClick={() => { setRefreshing(true); window.fillerAPI.refresh().finally(() => setRefreshing(false)); }} style={window.smallBtn}>↻</button>
          {window.LangToggle && onLanguageChange && (
            <window.LangToggle value={language} onChange={onLanguageChange} />
          )}
        </div>
      </div>

      {/* Flat category chips */}
      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>
        {isSv ? "Välj kategori" : "Select category"}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 24 }}>
        {window.FILLER_CATEGORIES.map(c => {
          const active = category === c.key;
          return (
            <button key={c.key} onClick={() => { setCategory(c.key); setError(""); }} style={{
              padding: "6px 12px", fontSize: 12, fontWeight: 500,
              background: active ? "var(--accent)" : "var(--bg-secondary)",
              color: active ? "#fff" : "var(--text-primary)",
              border: `1px solid ${active ? "var(--accent)" : "var(--border-default)"}`,
              borderRadius: 999, cursor: "pointer", transition: "all 0.12s",
            }}>{c.emoji} {catLabel(c)}</button>
          );
        })}
      </div>

      {/* Results */}
      {category && (
        <div>
          {/* Row: label + generate button */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>
              {catLabel(window.FILLER_CATEGORIES.find(c => c.key === category))}
              <span style={{ fontSize: 11, fontWeight: 400, color: "var(--text-tertiary)", marginLeft: 8 }}>
                {isSv ? `Visar topp ${Math.min(pool.length, TOP_N)}` : `Showing top ${Math.min(pool.length, TOP_N)}`}
              </span>
            </div>
            <button onClick={generate} disabled={generating || !hasKey} style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "8px 16px", fontSize: 13, fontWeight: 600,
              background: "#F5C518", color: "#3A2C00",
              border: "1px solid #C9A013", borderRadius: "var(--radius-md)",
              cursor: (generating || !hasKey) ? "not-allowed" : "pointer",
              opacity: (generating || !hasKey) ? 0.6 : 1,
            }}>
              {generating
                ? <><span style={{ display: "inline-block", animation: "spin 0.8s linear infinite" }}>⟳</span> {isSv ? "Genererar…" : "Generating…"}</>
                : <>{isSv ? "✨ Skapa ny aktivitet" : "✨ Create new activity"}</>
              }
            </button>
          </div>

          {!hasKey && (
            <div style={{ padding: "10px 12px", background: "var(--warning-bg)", color: "var(--warning-text)", borderRadius: "var(--radius-sm)", fontSize: 12, marginBottom: 12 }}>
              {isSv ? "Lägg till en API-nyckel i inställningarna för att generera aktiviteter." : "Add an API key in settings to generate activities."}
            </div>
          )}
          {error && (
            <div style={{ padding: "10px 12px", background: "var(--danger-bg)", color: "var(--danger-text)", borderRadius: "var(--radius-sm)", fontSize: 12, marginBottom: 12 }}>
              {error}
            </div>
          )}

          {/* Generation animation overlay */}
          {showAnim && (
            <div style={{ padding: "32px 0", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
              <div style={{ fontSize: 32 }}>⏱️</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>
                {isSv ? "Skapar aktivitet…" : "Creating activity…"}
              </div>
              <div style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
                {isSv ? "Kan ta 30–60 sekunder." : "May take 30–60 seconds."}
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                {[0,1,2].map(i => (
                  <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: "#F5C518", animation: `dot-pulse 1.4s ease-in-out ${i*0.2}s infinite` }} />
                ))}
              </div>
            </div>
          )}

          {pool.length === 0 && !generating && (
            <div style={{ padding: "40px 0", textAlign: "center", color: "var(--text-tertiary)", fontStyle: "italic", border: "1px dashed var(--border-default)", borderRadius: "var(--radius-md)" }}>
              {isSv ? "Inga aktiviteter ännu — skapa den första!" : "No activities yet — create the first one!"}
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {pool.map((item, idx) => (
              <FillerCard key={item.filler_id} item={item} language={language} config={config} rank={idx + 1} onEmail={setEmailItem} onArchive={id => window.fillerAPI.archive(id)} onDelete={id => window.fillerAPI.deletePermanently(id)} onToggleLang={onLanguageChange} />
            ))}
          </div>
        </div>
      )}

      {!category && !refreshing && (
        <div style={{ padding: "40px 0", textAlign: "center", color: "var(--text-tertiary)" }}>
          {isSv ? "Välj en kategori ovan för att bläddra eller skapa aktiviteter." : "Pick a category above to browse or create activities."}
        </div>
      )}

      {emailItem && <FillerEmailModal item={emailItem} language={language} onClose={() => setEmailItem(null)} />}
    </div>
  );
};
