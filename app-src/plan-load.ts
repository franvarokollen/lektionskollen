/* ── Loading ─────────────────────────────────────────── */
import { renderTeacher } from './plan-teacher';
import { renderLinked, runDate } from './plan-linked';
import { Plan } from './types';
import { render } from './plan-render';
import { $, L, Lang, P, PlanRow, RUN_CODE, esc, params, sb } from './plan-core';
export async function load() {
  if (RUN_CODE) {
    const rr = await sb.rpc('lk_run_by_token', { p_run: RUN_CODE });
    P.RUN = rr.data;
    if (!P.RUN) { $('out').innerHTML = '<p class="muted">' + esc(L().notFound) + '</p>'; return; }
    if (P.RUN.expired || !P.RUN.plan_token) {
      $('out').innerHTML = '<div class="full"><div class="offl">' + esc(L().runExpiredH) + '</div>' +
        '<p class="muted">' + esc(L().runExpiredB.replace('{g}', P.RUN.group_name).replace('{d}', runDate(P.RUN.used_on))) + '</p></div>';
      return;
    }
    P.token = P.RUN.plan_token;
  }
  if (!P.token) { $('out').innerHTML = '<p class="muted">' + esc(L().noCode) + '</p>'; return; }

  // The class teacher's own door. Same link shape, different question: the
  // substitute is asked whether the lesson could be delivered, the teacher
  // whether it was right.
  if (params.get('as') === 'teacher') {
    const tv = await sb.rpc('lk_teacher_view', { p_token: P.token });
    if (tv.data) { renderTeacher(tv.data); return; }
  }

  // A teacher's own plan arrives through the same door as a generated one, so
  // the substitute never has to know which kind they were sent.
  const linked = await sb.rpc('lk_linked_by_token', { p_token: P.token });
  if (linked.data) { renderLinked(linked.data); return; }

  const [plan, extras] = await Promise.all([
    sb.rpc('lk_plan_by_token', { p_token: P.token }),
    sb.rpc('lk_extras_by_token', { p_token: P.token }),
  ]);
  const ck = 'lk.plan.' + P.token;
  if (plan.error && !plan.data) {
    try {
      const c = JSON.parse(localStorage.getItem(ck) || 'null');
      if (c && c.plan) { P.OFFLINE = true; P.EXTRAS = c.extras || []; render(c.plan); return; }
    } catch { /* no cache */ }
  }
  if (plan.error || !plan.data) {
    $('out').innerHTML =
      '<p class="muted">' + esc(L().notFound) + '</p>';
    return;
  }
  P.EXTRAS = Array.isArray(extras.data) ? extras.data : [];
  try { localStorage.setItem(ck, JSON.stringify({ plan: plan.data, extras: P.EXTRAS })); } catch { /* private window */ }
  render(plan.data);
}

export function bodies(d: PlanRow): Partial<Record<Lang, Plan>> {
  const b: Partial<Record<Lang, Plan>> = {};
  b[(d.language || 'sv') as Lang] = d.body;
  if (d.body_alt && d.language_alt) b[d.language_alt as Lang] = d.body_alt;
  return b;
}
