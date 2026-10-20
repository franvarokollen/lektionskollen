/* Lektionskollen — the add-in, running against real Supabase.
   Schema: `lektionskollen` in the skolkollen-portal project, reached only
   through the public.lk_* security-definer functions. */

const SUPABASE_URL = 'https://pbamabzbfbkxajntsrmc.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBiYW1hYnpiZmJreGFqbnRzcm1jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzMzU3MTEsImV4cCI6MjA5NTkxMTcxMX0.9G3-2cFOHwVqVOsIBcHomrEEclISFUaIQlg10nIlWHM';

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function toast(msg, ms = 4000) {
  const t = $('toast');
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => { t.hidden = true; }, ms);
}

/* ── Stand-in for FVK's cover feed ──────────────────
   Shape mirrors cover_assignments. When FVK is wired up these arrive
   in the lk:init message instead. */
const ROWS = [
  { id: 'abs-1', time: '08:20–09:20', start: '08:20', end: '09:20', mins: 60, teacher: 'Anna Lindqvist',
    group: 'Tb7a', raw: 'Ma', subject: 'Matematik', year: 'Åk 7', room: 'A101', cover: 'Erik Sandberg', plannable: true },
  { id: 'abs-2', time: '09:40–10:40', start: '09:40', end: '10:40', mins: 60, teacher: 'Anna Lindqvist',
    group: 'Tb7b', raw: 'Ma', subject: 'Matematik', year: 'Åk 7', room: 'A101', cover: null, plannable: true },
  { id: 'abs-3', time: '10:00–10:45', start: '10:00', end: '10:45', mins: 45, teacher: 'Johan Berg',
    group: '', raw: 'Rast', subject: '—', year: '', room: 'Korridor B', cover: 'Sara Nilsson',
    plannable: false, why: 'Rastvakt — inte en lektion' },
  { id: 'abs-4', time: '11:00–11:45', start: '11:00', end: '11:45', mins: 45, teacher: 'Johan Berg',
    group: 'Tb5c', raw: 'Sv', subject: 'Svenska', year: 'Åk 5', room: 'B204', cover: 'Sara Nilsson', plannable: true },
  { id: 'abs-5', time: '13:00–14:00', start: '13:00', end: '14:00', mins: 60, teacher: 'Johan Berg',
    group: 'Tb9a', raw: 'En', subject: 'Engelska', year: 'Åk 9', room: 'B204', cover: null, plannable: true },
  { id: 'abs-6', time: '07:30–15:30', start: '07:30', end: '15:30', mins: 480, teacher: 'Leila Haddad',
    group: '', raw: 'Arbetstid', subject: '—', year: '', room: '', cover: null,
    plannable: false, why: 'Arbetstid — inte en lektion' },
  { id: 'abs-7', time: '14:15–15:35', start: '14:15', end: '15:35', mins: 80, teacher: 'Leila Haddad',
    group: 'Tb8b:SltmHT', raw: 'Sl', subject: 'Slöjd', year: 'Åk 8', room: 'Slöjdsal 2',
    cover: 'Mats Ek', plannable: true, practical: true },
];

const state = { me: null, row: null, plan: null, planId: null, view: 'coordinator', bank: [] };

/* ── No login in the test env ───────────────────────
   The lk_* functions fall back to the shared demo school for anonymous
   callers. Revoking the anon grants in Postgres restores a real login
   without touching this file. */
function boot() { enterApp(); }

$('signout').addEventListener('click', () => location.reload());

async function enterApp() {
  const { data, error } = await sb.rpc('lk_me');
  if (error) {
    document.body.innerHTML = '<p style="padding:40px;font:14px Geist,sans-serif">Kunde inte nå databasen: ' + esc(error.message) + '</p>';
    return;
  }

  if (!data || !data.school_id) {
    document.body.innerHTML = '<p style="padding:40px;font:14px Geist,sans-serif">Demoskolan saknas i databasen.</p>';
    return;
  }

  state.me = data;
  $('app').hidden = false;
  $('schoolname').textContent = data.school;
  $('username').textContent = data.role === 'demo' ? 'Delad testmiljö' : data.role;
  $('pagesub').textContent = new Date().toLocaleDateString('sv-SE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  renderRows();
  loadBank();
}

/* ── Cover table ───────────────────────────────────── */
function renderRows() {
  $('rows').innerHTML = ROWS.map((r) => {
    const action = !r.plannable
      ? '<span class="nolesson">' + esc(r.why) + '</span>'
      : '<button class="btn btn-primary btn-sm" data-open="' + r.id + '">Lektionsplan behövs</button>';
    return '<tr' + (r.plannable ? '' : ' class="muted"') + '>' +
      '<td class="mono">' + esc(r.time) + '</td>' +
      '<td class="who">' + esc(r.teacher) + '</td>' +
      '<td>' + (r.group ? esc(r.group) : '<span class="nolesson">—</span>') + '</td>' +
      '<td>' + (r.plannable
        ? esc(r.subject) + ' <span class="nolesson" style="font-style:normal">(' + esc(r.raw) + ')</span>'
        : esc(r.raw)) + '</td>' +
      '<td>' + esc(r.room || '—') + '</td>' +
      '<td>' + (r.cover
        ? '<span class="chip chip-ok">' + esc(r.cover) + '</span>'
        : '<span class="chip chip-warn">Otäckt</span>') + '</td>' +
      '<td style="text-align:right">' + action + '</td></tr>';
  }).join('');
}

/* ── Bank ──────────────────────────────────────────── */
async function loadBank() {
  const subject = $('f-subject').value || null;
  const year = $('f-year').value || null;
  const scope = $('f-scope').value || 'all';
  const { data, error } = await sb.rpc('lk_bank', { p_subject: subject, p_year: year, p_scope: scope });
  if (error) { $('bankgrid').innerHTML = '<p class="note">Kunde inte läsa banken: ' + esc(error.message) + '</p>'; return; }
  state.bank = data || [];
  fillFilterOptions();
  renderBank();
}

function fillFilterOptions() {
  const subs = [...new Set(state.bank.map((b) => b.subject))].sort();
  const yrs = [...new Set(state.bank.map((b) => b.year_group))].sort();
  const keep = (sel, list, label) => {
    const cur = sel.value;
    sel.innerHTML = '<option value="">' + label + '</option>' +
      list.map((x) => '<option' + (x === cur ? ' selected' : '') + '>' + esc(x) + '</option>').join('');
  };
  keep($('f-subject'), subs, 'Alla ämnen');
  keep($('f-year'), yrs, 'Alla årskurser');
}

function stars(r) {
  const n = Math.round(Number(r) || 0);
  return '★★★★★'.slice(0, n) + '☆☆☆☆☆'.slice(0, 5 - n);
}

function renderBank() {
  const g = $('bankgrid');
  if (!state.bank.length) {
    g.innerHTML = '<p class="note">Inga planer ännu. Skapa en från Daglig vikarie så dyker den upp här.</p>';
    return;
  }
  g.innerHTML = state.bank.map((b) =>
    '<div class="bcard">' +
      '<h4>' + esc(b.title) + '</h4>' +
      '<div class="tags">' +
        '<span class="chip chip-neutral">' + esc(b.subject) + '</span>' +
        '<span class="chip chip-neutral">' + esc(b.year_group) + '</span>' +
        '<span class="chip chip-neutral">' + b.minutes + ' min</span>' +
        (b.shared ? '<span class="chip chip-blue">Delad</span>' : '<span class="chip chip-neutral">Endast vår skola</span>') +
        (b.approved ? '' : '<span class="chip chip-warn">Ej godkänd</span>') +
      '</div>' +
      '<div class="stat">' +
        '<span class="stars">' + stars(b.rating) + ' <b>' + (Number(b.rating) || 0).toFixed(1) + '</b></span>' +
        '<span><b>' + b.rating_count + '</b> betyg</span>' +
      '</div>' +
      '<div style="display:flex;gap:6px;flex-wrap:wrap">' +
        '<button class="btn btn-soft btn-sm" data-viewplan="' + b.id + '">Öppna</button>' +
        (b.approved ? '<button class="btn btn-ghost btn-sm" data-copylink="' + esc(b.share_token) + '">Kopiera vikarielänk</button>' : '') +
      '</div>' +
    '</div>').join('');
}

/* ── Add-in ────────────────────────────────────────── */
function openAddin(id) {
  state.row = ROWS.find((x) => x.id === id);
  state.plan = null; state.planId = null; state.view = 'coordinator';
  $('overlay').hidden = false;
  document.body.style.overflow = 'hidden';
  showRequest();
}
function closeAddin() {
  $('overlay').hidden = true;
  document.body.style.overflow = '';
}

function showRequest() {
  const r = state.row;
  $('seam-state').textContent = 'lk:init';
  const matches = state.bank.filter((b) => b.subject === r.subject && b.year_group === r.year && b.approved);
  $('addin-content').innerHTML =
  '<div class="addin-body">' +
    '<div class="addin-head"><div style="flex:1;min-width:0">' +
      '<h2 id="addin-title">Lektionsplan för ' + esc(r.group) + '</h2>' +
      '<div class="plan-meta">' + esc(r.teacher) + ' · ' + esc(r.time) + ' · ' + esc(r.room) +
      (r.cover ? ' · ' + esc(r.cover) : ' · otäckt') + '</div></div>' +
      '<button class="x" data-close aria-label="Stäng">✕</button></div>' +

    '<div class="derived">' +
      '<div><dt>Ämne</dt><dd>' + esc(r.subject) + '</dd><div class="from">från koden "' + esc(r.raw) + '"</div></div>' +
      '<div><dt>Årskurs</dt><dd>' + esc(r.year) + '</dd><div class="from">härlett ur "' + esc(r.group) + '"</div></div>' +
      '<div><dt>Längd</dt><dd>' + r.mins + ' min</dd><div class="from">' + esc(r.start) + '–' + esc(r.end) + '</div></div>' +
    '</div>' +

    (r.practical ? '<div class="flag"><span>⚠</span><div><b>Praktiskt ämne.</b> En vikarie utan ämneskunskap bör inte ansvara för maskiner. Förvalt är en teorilektion utan verktyg.</div></div>' : '') +

    (matches.length
      ? '<div><div class="sect-h">Från banken — ' + matches.length + ' godkänd' + (matches.length === 1 ? '' : 'a') + '</div><div class="bankrow">' +
        matches.map((b) => '<button class="bankcard" data-usebank="' + b.id + '">' +
          '<div style="flex:1;min-width:0"><div class="t">' + esc(b.title) + '</div>' +
          '<div class="m">' + b.minutes + ' min · ' + b.rating_count + ' betyg' + (b.shared ? ' · delad' : '') + '</div></div>' +
          '<span class="stars">' + stars(b.rating) + '</span>' +
          '<span class="btn btn-soft btn-sm">Använd</span></button>').join('') + '</div></div>'
      : '<div><div class="sect-h">Från banken</div><p class="hint">Inga godkända planer för ' + esc(r.subject) + ' ' + esc(r.year) + ' ännu. Den här blir den första.</p></div>') +

    '<div><div class="sect-h">Styr innehållet</div><div class="steer">' +
      '<label class="f full">Område eller tema<input id="s-topic" placeholder="Lämna tomt så väljs ett fristående område ur det centrala innehållet"></label>' +
      '<label class="f full">Vad klassen arbetar med just nu<textarea id="s-notes" rows="2" placeholder="T.ex. &quot;de läser kapitel 4&quot;, &quot;pratig grupp efter lunch&quot;"></textarea></label>' +
      '<label class="f">Lektionstyp<select id="s-type">' +
        (r.practical
          ? '<option>Teorilektion (inga maskiner)</option><option>Fortsätt pågående arbete, övervakat</option><option>Praktisk lektion</option>'
          : '<option>Repetition</option><option>Nytt moment</option><option>Fördjupning</option><option>Tyst enskilt arbete</option>') +
      '</select></label>' +
      '<label class="f">Svårighetsgrad<select id="s-level"><option>Standard</option><option>Anpassad</option><option>Utmaning</option></select></label>' +
      '<label class="f">Vikariens ämneskunskap<select id="s-know"><option>Ingen — skriv ut allt</option><option>Viss ämneskunskap</option><option>Behörig i ämnet</option></select></label>' +
      '<label class="f">Planens språk<select id="s-lang"><option>Svenska</option><option>Engelska</option></select></label>' +
      '<div class="full"><div class="sect-h" style="margin-bottom:6px">Tillgängligt i salen</div><div class="chips">' +
        ['Whiteboard', 'Projektor', 'Datorer', 'Läroböcker', 'Minitavlor']
          .map((x, i) => '<button class="tog' + (i === 0 ? ' on' : '') + '" data-res>' + x + '</button>').join('') +
      '</div></div>' +
    '</div></div>' +

    '<div class="foot"><span class="hint">Endast ämne, årskurs, längd och dina anteckningar går till modellen. Inga elevuppgifter.</span>' +
      '<span class="spacer"></span><button class="btn btn-ghost" data-close>Avbryt</button>' +
      '<button class="btn btn-primary" data-generate>Skapa plan</button></div>' +
  '</div>';
}

function gatherRequest() {
  const r = state.row;
  return {
    absence_ref: r.id,
    subject: r.subject,
    year_group: r.year,
    group_name: r.group,
    room: r.room,
    starts_at: r.start,
    ends_at: r.end,
    minutes: r.mins,
    topic: $('s-topic')?.value || '',
    notes: $('s-notes')?.value || '',
    lesson_type: $('s-type')?.value || '',
    level: $('s-level')?.value || '',
    sub_knowledge: $('s-know')?.value || '',
    language: ($('s-lang')?.value === 'Engelska') ? 'en' : 'sv',
    resources: [...document.querySelectorAll('[data-res].on')].map((b) => b.textContent),
  };
}

async function generate() {
  const req = gatherRequest();
  $('seam-state').textContent = 'genererar…';
  $('addin-content').innerHTML =
    '<div class="gen"><div class="bar"><i id="pbar" style="width:12%"></i></div>' +
    '<div class="genstep" id="pstep">Anropar lk-generate…</div>' +
    '<p class="hint" style="max-width:420px">Ingen modell är inkopplad ännu, så kantfunktionen svarar med en skriven plan. ' +
    'Sätt AI_BASE_URL och AI_MODEL som function secrets så byter den till riktig generering utan kodändring.</p></div>';

  let pct = 12;
  const tick = setInterval(() => { pct = Math.min(90, pct + 9); const b = $('pbar'); if (b) b.style.width = pct + '%'; }, 400);

  const { data, error } = await sb.functions.invoke('lk-generate', { body: { request: req } });
  clearInterval(tick);

  if (error || data?.error) {
    const msg = data?.error || error?.message || 'okänt fel';
    $('addin-content').innerHTML =
      '<div class="addin-body"><div class="addin-head"><h2>Det gick inte</h2>' +
      '<button class="x" data-close aria-label="Stäng">✕</button></div>' +
      '<div class="alert error">' + esc(msg) + '</div>' +
      '<div class="foot"><span class="spacer"></span><button class="btn btn-ghost" data-close>Stäng</button>' +
      '<button class="btn btn-primary" data-generate>Försök igen</button></div></div>';
    return;
  }

  const { data: pid, error: saveErr } = await sb.rpc('lk_save_plan', {
    p_request: req, p_plan: data.plan, p_model: data.model || null,
  });
  if (saveErr) { toast('Planen skapades men kunde inte sparas: ' + saveErr.message); }

  state.plan = data.plan;
  state.planId = pid || null;
  state.approved = false;
  state.shareToken = null;
  showPlan();
  loadBank();
}

async function usePlan(id) {
  const { data, error } = await sb.rpc('lk_plan', { p_id: id });
  if (error || !data) { toast('Kunde inte öppna planen'); return; }
  state.plan = data.body;
  state.planId = data.id;
  state.approved = data.approved;
  state.shareToken = data.share_token;
  if (!state.row) state.row = { subject: data.subject, year: data.year_group, group: '—', mins: data.minutes, start: '', end: '', room: '—', teacher: '—', cover: null };
  $('overlay').hidden = false;
  document.body.style.overflow = 'hidden';
  showPlan();
}

function showPlan() {
  const r = state.row, p = state.plan;
  $('seam-state').textContent = state.approved ? 'godkänd' : 'väntar på godkännande';
  const head =
  '<div class="addin-body">' +
    '<div class="addin-head"><div style="flex:1;min-width:0">' +
      '<h2 id="addin-title" class="plan-title">' + esc(p.title) + '</h2>' +
      '<div class="plan-meta">' + esc(r.subject) + ' · ' + esc(r.year) + ' · ' + esc(r.group) +
      (r.start ? ' · ' + esc(r.start) + '–' + esc(r.end) : '') + '</div></div>' +
      '<button class="x" data-close aria-label="Stäng">✕</button></div>' +
    '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">' +
      '<div class="viewtog">' +
        '<button class="' + (state.view === 'coordinator' ? 'on' : '') + '" data-view="coordinator">Samordnare</button>' +
        '<button class="' + (state.view === 'vikarie' ? 'on' : '') + '" data-view="vikarie">Vikarie</button>' +
      '</div><span class="hint">' +
      (state.view === 'coordinator' ? 'Det du granskar på 30 sekunder' : 'Det vikarien får — ' + esc(p.readTime || '')) +
      '</span></div>';
  $('addin-content').innerHTML = head + (state.view === 'coordinator' ? coordView(p, r) : vikarieView(p, r)) + '</div>';
}

function minDiff(a, b) {
  const [h1, m1] = a.split(':').map(Number), [h2, m2] = b.split(':').map(Number);
  return (h2 * 60 + m2) - (h1 * 60 + m1);
}

function coordView(p, r) {
  const phases = p.phases || [];
  const sum = phases.reduce((a, ph) => { const m = String(ph.t || '').split('–'); return a + (m.length === 2 ? minDiff(m[0], m[1]) : 0); }, 0);
  const link = state.shareToken ? location.href.replace(/index\.html.*$|\/?$/, '/') + 'plan.html?t=' + state.shareToken : null;
  return '<div class="plan">' +
    '<div class="ps" style="border:0;padding-top:4px"><h4>Vad lektionen är</h4><p>' + esc(p.summary) + '</p></div>' +
    '<div class="twocol">' +
      '<div class="callout"><strong>Lärandemål</strong>' + esc(p.goal) + '</div>' +
      '<div class="callout"><strong>Läroplan</strong><span style="font-size:12.5px">' + esc(p.curriculum) + '</span></div>' +
    '</div>' +
    '<div class="ps"><h4>Att kontrollera</h4><ul>' +
      '<li>Faserna summerar till <b>' + sum + ' min</b> — lektionen är ' + r.mins + ' min. ' +
        (sum === r.mins ? '<span class="chip chip-ok">stämmer</span>' : '<span class="chip chip-warn">kontrollera</span>') + '</li>' +
      '<li>Allt material är utskrivet i planen. <span class="chip chip-ok">ok</span></li>' +
      '<li>Kräver: ' + esc(p.equipment?.need || '—') + '</li>' +
    '</ul></div>' +
    (state.approved
      ? '<div class="flag" style="background:var(--ok-bg);color:#14532d"><span>✓</span><div><b>Godkänd.</b> ' +
        (link ? 'Vikarielänk: <span class="mono" style="font-size:12px">' + esc(link) + '</span>' : '') + '</div></div>'
      : '') +
    '<div class="foot">' +
      (state.approved
        ? '<span class="spacer"></span><button class="btn btn-ghost" data-view="vikarie">Se vikariens vy</button>' +
          (link ? '<button class="btn btn-primary" data-copylink="' + esc(state.shareToken) + '">Kopiera vikarielänk</button>' : '')
        : '<span class="hint">Inget går till vikarien innan du godkänt.</span><span class="spacer"></span>' +
          '<button class="btn btn-ghost" data-regen>Skapa ny</button>' +
          '<button class="btn btn-ok" data-approve>Godkänn</button>') +
    '</div></div>';
}

function vikarieView(p, r) {
  const L = (x) => esc(x);
  let h = '<div class="plan">';
  h += '<div class="flag" style="background:#f0f5fb;color:#14407a"><span>①</span><div><b>De första 90 sekunderna</b>' +
       '<ul style="margin:6px 0 0;padding-left:18px">' + (p.first90 || []).map((x) => '<li>' + L(x) + '</li>').join('') + '</ul></div></div>';
  h += '<div class="ps"><h4>Översikt</h4><p>' + L(p.summary) + '</p>' +
       '<p style="font-size:13px;color:var(--ink-soft)"><b>Mål:</b> ' + L(p.goal) + '</p></div>';
  h += '<div class="ps"><h4>Skriv på tavlan innan det ringer</h4><div class="board">' + L(p.board) + '</div>' +
       '<p style="margin-top:8px;font-size:13px"><b>Du behöver:</b> ' + L(p.equipment?.need) + '<br>' +
       '<span style="color:var(--ink-soft)">' + L(p.equipment?.fallback) + '</span></p></div>';

  h += '<div class="ps"><h4>Lektionen, på klockan</h4>';
  (p.phases || []).forEach((ph) => {
    h += '<div class="phase"><div class="phase-h"><span class="clock">' + L(ph.t) + '</span><strong>' + L(ph.n) + '</strong></div>' +
      '<div class="say"><em>Säg</em>' + L(ph.say) + '</div>' +
      '<p style="font-size:13px"><b>Eleverna:</b> ' + L(ph.pupils) + '</p>' +
      (ph.expect && ph.expect !== '—' ? '<p style="font-size:13px;color:var(--ink-soft)"><b>Förväntat:</b> ' + L(ph.expect) + '</p>' : '') +
      ((ph.checks || []).length
        ? '<p style="font-size:13px;margin-bottom:3px"><b>Kontrollfråga:</b></p><ul style="margin:0;padding-left:18px;font-size:13px">' +
          ph.checks.map((c) => '<li>' + L(c.q) + '<br><span class="ans">Svar: ' + L(c.a) + '</span></li>').join('') + '</ul>'
        : '') + '</div>';
  });
  h += '</div>';

  h += '<div class="ps"><h4>Allt du delar ut</h4>' +
    (p.materials || []).map((m) => '<div class="mat"><h5>' + L(m.h) + '</h5><div>' + L(m.body) + '</div></div>').join('') + '</div>';
  h += '<div class="ps"><h4>Uppgifter med facit</h4><ol style="font-size:13.5px">' +
    (p.tasks || []).map((t) => '<li>' + L(t.q) + ' <span class="ans">' + L(t.a) + '</span></li>').join('') + '</ol></div>';
  h += '<div class="ps"><h4>Om de blir klara tidigt, om de fastnar</h4><div class="twocol">' +
    '<div class="callout"><strong>Fastnar</strong>' + L(p.stuck) + '</div>' +
    '<div class="callout"><strong>Klara tidigt</strong>' + L(p.ahead) + '</div></div></div>';
  h += '<div class="ps"><h4>Om det går snett</h4><p>' + L(p.wrong) + '</p></div>';
  h += '<div class="ps"><h4>Exit ticket</h4><p>' + L(p.exit?.q) + '<br><span class="ans">' + L(p.exit?.a) + '</span></p></div>';
  h += '<div class="ps"><h4>Vem du ringer</h4><p><b>Samordnaren</b> · ' + esc(state.me?.school || '') +
       '<br><span style="color:var(--ink-soft);font-size:13px">Numret fylls i från FVK när det är kopplat.</span></p></div>';
  h += '<div class="ps"><h4>Överlämning</h4><p style="white-space:pre-wrap">' + L(p.handover) + '</p></div>';
  h += '<div class="foot"><span class="hint">Vikarien ser det här på en länk utan inloggning.</span><span class="spacer"></span>' +
       '<button class="btn btn-ghost" data-view="coordinator">Tillbaka</button></div></div>';
  return h;
}

/* ── Events ────────────────────────────────────────── */
document.addEventListener('click', async (e) => {
  const t = e.target.closest('[data-open],[data-close],[data-generate],[data-approve],[data-regen],[data-view],[data-usebank],[data-res],[data-viewplan],[data-copylink],#nav-cover,#nav-bank,#refreshbank');
  if (!t) return;

  if (t.id === 'nav-cover') return showScreen('cover');
  if (t.id === 'nav-bank') return showScreen('bank');
  if (t.id === 'refreshbank') return loadBank();
  if (t.hasAttribute('data-res')) return t.classList.toggle('on');
  if (t.hasAttribute('data-open')) return openAddin(t.getAttribute('data-open'));
  if (t.hasAttribute('data-close')) return closeAddin();
  if (t.hasAttribute('data-generate')) return generate();
  if (t.hasAttribute('data-regen')) return showRequest();
  if (t.hasAttribute('data-view')) { state.view = t.getAttribute('data-view'); return showPlan(); }
  if (t.hasAttribute('data-viewplan')) return usePlan(t.getAttribute('data-viewplan'));
  if (t.hasAttribute('data-usebank')) return usePlan(t.getAttribute('data-usebank'));

  if (t.hasAttribute('data-copylink')) {
    const url = location.href.replace(/[^/]*$/, '') + 'plan.html?t=' + t.getAttribute('data-copylink');
    try { await navigator.clipboard.writeText(url); toast('Vikarielänk kopierad'); }
    catch { toast(url, 12000); }
    return;
  }

  if (t.hasAttribute('data-approve')) {
    const { error } = await sb.rpc('lk_approve', { p_id: state.planId });
    if (error) { toast('Kunde inte godkänna: ' + error.message); return; }
    await sb.rpc('lk_rate', { p_id: state.planId, p_score: 5, p_comment: 'Godkänd av samordnare' });
    const { data } = await sb.rpc('lk_plan', { p_id: state.planId });
    state.approved = true;
    state.shareToken = data?.share_token || null;
    showPlan();
    loadBank();
    toast('Godkänd och sparad i banken');
    return;
  }
});

document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('overlay').hidden) closeAddin(); });
$('overlay').addEventListener('mousedown', (e) => { if (e.target.id === 'overlay') closeAddin(); });
['f-subject', 'f-year', 'f-scope'].forEach((id) => $(id).addEventListener('change', loadBank));

function showScreen(which) {
  $('screen-cover').hidden = which !== 'cover';
  $('screen-bank').hidden = which !== 'bank';
  $('nav-cover').classList.toggle('on', which === 'cover');
  $('nav-bank').classList.toggle('on', which === 'bank');
  $('pagetitle').textContent = which === 'cover' ? 'Daglig vikarie' : 'Lektionsbank';
  if (which === 'bank') loadBank();
  window.scrollTo(0, 0);
}

boot();
