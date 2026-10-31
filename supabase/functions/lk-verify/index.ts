// © 2026 Frånvarokollen Sverige AB. All rights reserved. Proprietary and confidential: see LICENSE.
// Check a plan before a human is asked to approve it.
//
// Two passes, in order of cost and certainty.
//
// 1. STRUCTURE, TEACHING AND QUALITY — lk_check_plan in the database. Deterministic,
//    free, and catches the faults that need no subject knowledge to spot: a question
//    whose answer only points at another answer, phases that do not add up to
//    the lesson, an exit ticket with no key, a script that promises a worked
//    example the plan does not contain. This runs always.
//
// 2. SUBJECT — a second model call that reads the lesson the way a pupil and a
//    substitute would. It does not take the answer key on trust: it solves each
//    question itself first and only then compares. It also asks the things only
//    a reader can: is the question ambiguous or badly worded, does it need
//    something the plan never provides, and was it actually taught by the
//    lesson that precedes it. Verification is far easier than generation and
//    its output is a short list, so the strongest model available costs almost
//    nothing here. Skipped when no model is configured.
//
//    It runs on authored-library plans too. "A person wrote it" is not a check:
//    a line-by-line read of the whole demo library found wrong, ambiguous and
//    untaught questions that nobody had ever solved.
//
// What this deliberately does NOT do is decide. It reports. A coordinator may
// know something the checker does not, and a plan held back by a machine with
// no way to overrule it is a worse product than one that says what it found.

import { createClient } from 'jsr:@supabase/supabase-js@2';
import { cors, json } from '../_shared/http.ts'
import { temperature } from '../_shared/model.ts'

interface Finding {
  level: 'blocker' | 'warn';
  code: string;
  where: string;
  detail: string;
}

/** Ask the model to check the answers, and nothing else. */
async function checkSubject(
  body: Record<string, unknown>,
  subject: string,
  year: string,
): Promise<{ ran: boolean; findings: Finding[]; note?: string }> {
  const base = Deno.env.get('AI_BASE_URL');
  const key = Deno.env.get('AI_API_KEY');
  const model = Deno.env.get('AI_MODEL_VERIFY') || Deno.env.get('AI_MODEL');
  if (!base || !key || !model) {
    return { ran: false, findings: [], note: 'no model configured' };
  }

  // The question-and-answer pairs, plus (below) a short account of what the
  // lesson teaches. Not the whole plan: the task stays narrow and the call cheap.
  const pairs: { where: string; q: string; a: string }[] = [];
  const phases = (body.phases ?? []) as Record<string, unknown>[];
  phases.forEach((ph, i) => {
    ((ph.checks ?? []) as Record<string, string>[]).forEach((c, j) => {
      pairs.push({ where: `phase ${i + 1}, check ${j + 1}`, q: c.q, a: c.a });
    });
  });
  ((body.tasks ?? []) as Record<string, string>[]).forEach((t, i) => {
    pairs.push({ where: `task ${i + 1} (${t.tier ?? 'core'})`, q: t.q, a: t.a });
  });
  const rec = body.recall as Record<string, unknown> | undefined;
  ((rec?.qs ?? []) as Record<string, string>[]).forEach((q, i) => {
    pairs.push({ where: `recap question ${i + 1}`, q: q.q, a: q.a });
  });
  const mo = body.model as Record<string, string> | undefined;
  if (mo?.p) pairs.push({ where: 'worked example', q: mo.p, a: mo.a });
  if (mo?.tq) pairs.push({ where: 'one together', q: mo.tq, a: mo.ta });
  const ex = body.exit as Record<string, string> | undefined;
  if (ex?.q) pairs.push({ where: 'exit ticket', q: ex.q, a: ex.a });
  if (!pairs.length) return { ran: false, findings: [], note: 'nothing to check' };

  // What the lesson teaches, in the order it is taught. A question can only be
  // fair if the answer is reachable from this or from the year group's
  // prior knowledge.
  const taught: string[] = [];
  const goal = String(body.goal ?? '');
  if (goal) taught.push(`Goal: ${goal}`);
  if (mo?.p) taught.push(`Worked example: ${mo.p}`);
  ((mo as unknown as { st?: { b?: string; s?: string }[] })?.st ?? []).forEach((st, i) => {
    taught.push(`  step ${i + 1} board: ${st.b ?? ''} | said: ${st.s ?? ''}`);
  });
  phases.forEach((ph, i) => {
    if (ph.board) taught.push(`Board, phase ${i + 1}: ${String(ph.board).slice(0, 300)}`);
  });

  const system =
    'You are a meticulous reviewer of school lesson plans written for substitute teachers. ' +
    'You are given the subject, year group, what the lesson teaches, and every question with the ' +
    "plan's answer. Do three things, in this order.\n" +
    '1. SOLVE each question yourself, ignoring the given answer. Only then compare. If your answer ' +
    'differs, or the given answer is incomplete or misleading for the year group, report it.\n' +
    '2. CLARITY. Report a question that has more than one defensible reading, that quotes a sentence ' +
    'without quote marks, that uses a word or concept the year group would not know, or whose ' +
    'wording is grammatically broken.\n' +
    '3. FAIRNESS. Report a question that needs a text, picture, map or resource the plan does not give, ' +
    'or a fact or method the lesson never taught and the year group could not be expected to know.\n' +
    'An open task whose answer describes what counts as acceptable is correct; do not mark it wrong ' +
    'for lacking one fixed answer. Judge substance, not style. ' +
    'Reply as JSON: {"findings":[{"where":"...","kind":"answer_wrong|unclear|untaught|missing_material",' +
    '"problem":"one sentence"}]} listing ONLY real faults. An empty list means everything checked out.';

  const user = `Subject: ${subject}\nYear group: ${year}\n\nWHAT THE LESSON TEACHES\n${taught.join('\n')}\n\nQUESTIONS\n` +
    pairs.map((p) => `[${p.where}]\nQ: ${p.q}\nA: ${p.a}`).join('\n\n');

  try {
    const res = await fetch(`${base.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model,
        messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
        ...temperature(),
        // Anthropic's compatibility layer ignores response_format, so leave
        // AI_JSON_MODE unset there. The fence-stripping below covers it.
        ...(Deno.env.get('AI_JSON_MODE') ? { response_format: { type: 'json_object' } } : {}),
        // A list of findings is short; without a ceiling the provider's
        // default applies, which on some is the whole context.
        max_tokens: Number(Deno.env.get('AI_VERIFY_MAX_TOKENS') ?? 4000),
      }),
      signal: AbortSignal.timeout(45000),
    });
    if (!res.ok) return { ran: false, findings: [], note: `verifier returned ${res.status}` };
    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content ?? '{}';
    const parsed = JSON.parse(String(text).replace(/^```(?:json)?|```$/g, '').trim());
    const found = (parsed.findings ?? []) as { where: string; problem: string; kind?: string }[];
    return {
      ran: true,
      findings: found.map((f) => ({
        level: 'blocker' as const,
        code: ['answer_wrong', 'unclear', 'untaught', 'missing_material'].includes(String(f.kind))
          ? String(f.kind) : 'answer_wrong',
        where: String(f.where ?? 'unknown'),
        detail: String(f.problem ?? 'The answer looks wrong.'),
      })),
    };
  } catch (e) {
    // A verifier that is down must not block a lesson. Say so and move on.
    return { ran: false, findings: [], note: String((e as Error)?.message ?? e) };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  let payload: { plan_id?: string };
  try {
    payload = await req.json();
  } catch {
    return json({ error: 'no_body' }, 400);
  }

  const db = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // Only a plan the caller can open: it is looked up as the caller, with the
  // same scope as the app (own school's plans, and shared ones). A free-form
  // body is not accepted — it made this a model anyone could call for free.
  if (!payload.plan_id) return json({ error: 'no_plan' }, 400);
  const asCaller = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } },
  );
  const { data: plan, error: pErr } = await asCaller.rpc('lk_plan', { p_id: payload.plan_id });
  if (pErr || !plan) return json({ error: 'plan_not_found' }, 404);
  const body = plan.body as Record<string, unknown>;
  const subject = String(plan.subject ?? '');
  const year = String(plan.year_group ?? '');
  const minutes = (plan.minutes ?? null) as number | null;
  const language = String(plan.language ?? '');

  // lk_check_plan, not lk_validate_full: the whole deterministic verdict, which
  // includes the quality gate (missing material, unquoted sentences, repeats).
  const { data: structure, error: vErr } = await db.rpc('lk_check_plan', {
    p_body: body, p_minutes: minutes, p_language: language || null,
  });
  if (vErr) return json({ error: vErr.message }, 500);

  // Authored-library plans are checked like any other. A person wrote them,
  // and a read of the whole demo library found questions nobody had solved.
  const subjectPass = await checkSubject(body, subject, year);

  const problems = [...(structure.problems ?? []), ...subjectPass.findings];
  return json({
    ok: problems.every((p: Finding) => p.level !== 'blocker'),
    blockers: problems.filter((p: Finding) => p.level === 'blocker').length,
    warnings: problems.filter((p: Finding) => p.level === 'warn').length,
    structure_checked: true,
    subject_checked: subjectPass.ran,
    note: subjectPass.note,
    problems,
  });
});
