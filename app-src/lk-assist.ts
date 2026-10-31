// © 2026 Frånvarokollen Sverige AB. All rights reserved. Proprietary and confidential: see LICENSE.
/* ── Live assist (coordinator preview) ──────────────────
   The coordinator sees exactly what the substitute gets, and can judge the
   quality of it, but nothing here is saved: the heat map that tells us which
   sections are weak must be substitute presses only, not curiosity. */
import { $, Extra, LANG, Row, SHELL, StrMap, esc, sb, state, t } from './lk-core';
import { fbFlag, fbHeatMap } from './lk-feedback';
import { Plan } from './types';
function assistRow(ref: string, label: string | undefined) {
  const a = (k: string, v: string, txt: string) =>
    '<button data-assist="' + k + '" data-ref="' + esc(ref) + '"' +
    (v ? ' data-variant="' + v + '"' : '') +
    ' data-alabel="' + esc(label) + '">' + esc(txt) + '</button>';
  return '<div class="assist noprint">' +
    a('explain', '', t('aExplain')) + a('exercise', '', t('aExercise')) +
    a('level', 'easier', t('aEasier')) + a('level', 'harder', t('aHarder')) + '</div>';
}

function assistSheetHtml(extra: Extra, source: string) {
  const srcTxt = source === 'model' ? t('srcModel') : source === 'cache' ? t('srcCache') : source === 'fallback' ? t('srcFallback') : t('srcLibrary');
  let h = '<h3>' + esc(extra.title) + '</h3><div class="src">' + esc(srcTxt) +
          (extra.minutes ? ' · ' + extra.minutes + ' min' : '') + ' · ' + esc(t('assistPreview')) + '</div>';
  h += '<ol>' + (extra.lines || []).map((x) => '<li>' + esc(x) + '</li>').join('') + '</ol>';
  if (extra.board) {
    h += '<h4 style="font-size:13px;margin-bottom:5px">' + esc(t('boardNow')) + '</h4>' +
         '<div class="board">' + esc(extra.board) + '</div>';
  }
  if ((extra.tasks || []).length) {
    h += '<h4 style="font-size:13px;margin:14px 0 5px">' + esc(t('tasksNow')) + '</h4>' +
         '<ol style="font-size:13.5px">' + extra.tasks!.map((x) =>
           '<li>' + esc(x.q) + ' <span class="ans">' + esc(x.a) + '</span></li>').join('') + '</ol>';
  }
  return h;
}

export async function previewAssist(opts: { kind: string; ref?: string; label?: string; text?: string; variant?: string; minutes?: number }) {
  const sheet = $('assist-sheet'), bodyEl = $('assist-sheet-body');
  bodyEl.innerHTML = '<h3><span class="spin"></span> ' + esc(t('working')) + '</h3>';
  sheet.hidden = false;

  const r = state.row, p = state.plan;
  const { data, error } = await sb.functions.invoke('lk-assist', {
    body: {
      kind: opts.kind,
      section_ref: opts.ref,
      section_label: opts.label,
      section_text: opts.text || '',
      variant: opts.variant || '',
      language: LANG,
      // So the extras cap applies to the right plan rather than pooling every
      // plan's extras into one bucket.
      plan_id: state.planId || undefined,
      subject: r?.subject,
      year_group: r?.year,
      topic: p?.title,
      minutes_left: opts.minutes || undefined,
    },
  });
  if (error || !data?.extra) {
    bodyEl.innerHTML = '<h3>—</h3><p class="muted">' + esc(error?.message || 'error') + '</p>';
    return;
  }
  // The response carries both languages; show the one being read.
  const shown = data.language === LANG ? data.extra
              : (data.language_alt === LANG && data.extra_alt) ? data.extra_alt
              : data.extra;
  bodyEl.innerHTML = assistSheetHtml(shown, data.source);
}

export function vikarieView(p: Plan, _r: Row) {
  // One renderer, shared with the substitute's own page. This used to be a
  // second, parallel implementation; the two drifted and this was the stale
  // one, which is the one everybody looked at — it is what the FVK iframe
  // shows. The only coupling left is the label lookup, because the two hosts
  // carry different i18n.
  const MAP: StrMap = {
    goal: 'goalShort', need: 'youNeed', expect: 'expected',
    tasks: 'tasksTitle', stuck: 'stuckL', ahead: 'aheadL', wrong: 'goesWrong',
  };
  const HEAT = fbHeatMap();
  const lbl = (k: string) => t(MAP[k] || k);

  let h = '<div class="plan"><div class="planview">' +
    window.LKPlan.render(p, {
      lbl,
      assistRow: (ref: string, name?: string) => assistRow(ref, name),
      flag: (ref: string) => fbFlag(HEAT, ref),
      // The coordinator is previewing, not teaching: no projector, and the
      // depth switch belongs to the person in front of the class.
      projector: false,
    }) + '</div>';

  h += window.LKPlan.after(p, lbl) +
    '<section class="reg reg-plain"><div class="reg-h"><span class="n">&#9742;</span>' +
    esc(t('whoToCall')) + '</div>' +
    '<p style="font-size:13px"><b>' + esc(t('coordinator')) + '</b> · ' + esc(state.me?.school || '') +
    (SHELL === 'fvk' ? '<br><span style="color:var(--ink-soft)">' + esc(t('phoneNote')) + '</span>' : '') + '</p></section>';

  h += '<section class="reg reg-plain"><div class="reg-h"><span class="n">+</span>' +
       esc(t('assistTitle')) + '</div>' +
       '<p class="hint" style="margin:0 0 9px">' + esc(t('assistNote')) + '</p>' +
       '<div class="assist noprint"><span class="hint" style="align-self:center">' + esc(t('minLeft')) + '</span>' +
       [5, 10, 15, 20].map((m) => '<button data-fill="' + m + '">' + m + '</button>').join('') +
       '</div></section>';

  h += '<div class="foot"><span class="hint">' + esc(t('subSeesThis')) + '</span><span class="spacer"></span>' +
       '<button class="btn btn-ghost" data-view="coordinator">' + esc(t('back')) + '</button></div></div>';
  return h;
}
