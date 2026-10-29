/* ── Problems, reported to the database ──────────────────
   Shared by the coordinator app and the substitute page. Two sources, one
   table (problem_reports, through lk_report):

     error   a script error or a failed promise nobody caught, sent on its own
     user    the "Report a problem" button: what the person says went wrong

   The browser can add a report but never read one; read them in the Supabase
   table editor. Nothing here may ever break the page it watches: every send is
   fire-and-forget, and at most a few errors leave one page load. */

const MAX_ERRORS = 5;
let sent = 0;
const seen = new Set<string>();

/** This build's id, stamped into the page by tools/stamp-build.mjs. */
const build = () => document.querySelector<HTMLMetaElement>('meta[name="lk-build"]')?.content || '';

function send(sb: SbClient, kind: 'error' | 'user', message: string, page: string, detail: Record<string, unknown>) {
  try {
    return Promise.resolve(sb.rpc('lk_report', {
      p_kind: kind, p_message: message, p_page: page, p_build: build(), p_detail: detail,
    })).then((r) => !r.error && r.data === true, () => false);
  } catch { return Promise.resolve(false); }
}

/** Report uncaught errors from this page. `where` says which screen it was on. */
export function watchErrors(sb: SbClient, where: () => string) {
  const once = (msg: string, detail: Record<string, unknown>) => {
    msg = msg.trim().slice(0, 1000);
    // Browser noise that is not ours to fix.
    if (!msg || /ResizeObserver loop|^Script error\.?$/i.test(msg)) return;
    if (sent >= MAX_ERRORS || seen.has(msg)) return;
    seen.add(msg); sent++;
    send(sb, 'error', msg, where(), { ...detail, ua: navigator.userAgent, lang: document.documentElement.lang });
  };
  window.addEventListener('error', (e) => {
    // Extensions and other sites' scripts: not ours.
    if (e.filename && !e.filename.startsWith(location.origin)) return;
    once(String(e.message || 'error'), {
      src: (e.filename || '').replace(location.origin, ''), line: e.lineno, col: e.colno,
      stack: String((e.error as Error | undefined)?.stack || '').slice(0, 4000),
    });
  });
  window.addEventListener('unhandledrejection', (e) => {
    const r = e.reason as { message?: string; stack?: string } | string | undefined;
    const msg = typeof r === 'string' ? r : r?.message || String(r);
    once(msg, { stack: typeof r === 'object' ? String(r?.stack || '').slice(0, 4000) : '' });
  });
}

export interface ReportText { title: string; hint: string; placeholder: string; send: string; cancel: string; thanks: string; fail: string }

/** The "Report a problem" dialog. `toast` shows the outcome. */
export function openReport(sb: SbClient, where: () => string, txt: ReportText, toast: (s: string) => void) {
  document.getElementById('lk-report')?.remove();
  const d = document.createElement('dialog');
  d.id = 'lk-report';
  d.className = 'reportdlg';
  d.innerHTML =
    '<form method="dialog">' +
      '<h3></h3><p class="hint"></p>' +
      '<textarea maxlength="2000" rows="5"></textarea>' +
      '<div class="foot"><span class="spacer"></span>' +
        '<button type="button" class="btn btn-ghost" data-rcancel></button>' +
        '<button type="submit" class="btn btn-primary" data-rsend></button></div>' +
    '</form>';
  // Text through textContent: none of it is markup.
  d.querySelector('h3')!.textContent = txt.title;
  d.querySelector('.hint')!.textContent = txt.hint;
  const ta = d.querySelector('textarea')!;
  ta.placeholder = txt.placeholder;
  const ok = d.querySelector<HTMLButtonElement>('[data-rsend]')!;
  ok.textContent = txt.send;
  d.querySelector<HTMLButtonElement>('[data-rcancel]')!.textContent = txt.cancel;
  d.querySelector('[data-rcancel]')!.addEventListener('click', () => d.close());
  d.addEventListener('close', () => d.remove());
  d.querySelector('form')!.addEventListener('submit', (e) => {
    e.preventDefault();
    const msg = ta.value.trim();
    if (!msg) { ta.focus(); return; }
    ok.disabled = true;
    send(sb, 'user', msg, where(), { ua: navigator.userAgent, lang: document.documentElement.lang, w: innerWidth, h: innerHeight })
      .then((done) => { if (done) { d.close(); toast(txt.thanks); } else { ok.disabled = false; toast(txt.fail); } });
  });
  document.body.appendChild(d);
  d.showModal();
  ta.focus();
}
