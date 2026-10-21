// Check a plan before a human is asked to approve it.
//
// Two passes, in order of cost and certainty.
//
// 1. STRUCTURE — lk_validate_plan in the database. Deterministic, free, and
//    catches the faults that need no subject knowledge to spot: a question
//    whose answer only points at another answer, phases that do not add up to
//    the lesson, an exit ticket with no key. This runs always.
//
// 2. SUBJECT — a second model call whose only job is to check the answers.
//    Verification is a far easier task than generation and its output is a
//    short verdict, so the strongest model available costs almost nothing here.
//    Skipped when no model is configured, and when the plan came from the
//    written library, where the answers were written by a person.
//
// What this deliberately does NOT do is decide. It reports. A coordinator may
// know something the checker does not, and a plan held back by a machine with
// no way to overrule it is a worse product than one that says what it found.

import { createClient } from 'jsr:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });

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

  // Only the question-and-answer pairs go over. The verifier does not need the
  // lesson's prose, and sending less keeps the call cheap and the task narrow.
  const pairs: { where: string; q: string; a: string }[] = [];
  const phases = (body.phases ?? []) as Record<string, unknown>[];
  phases.forEach((ph, i) => {
    ((ph.checks ?? []) as Record<string, string>[]).forEach((c, j) => {
      pairs.push({ where: `phase ${i + 1}, check ${j + 1}`, q: c.q, a: c.a });
    });
  });
  ((body.tasks ?? []) as Record<string, string>[]).forEach((t, i) => {
    pairs.push({ where: `task ${i + 1}`, q: t.q, a: t.a });
  });
  const ex = body.exit as Record<string, string> | undefined;
  if (ex?.q) pairs.push({ where: 'exit ticket', q: ex.q, a: ex.a });
  if (!pairs.length) return { ran: false, findings: [], note: 'nothing to check' };

  const system =
    'You check school lesson answers. For each question and answer pair, say whether ' +
    'the answer is correct and appropriate for the year group. Judge only correctness ' +
    'and suitability, never style. An open task whose answer describes what counts as ' +
    'acceptable is correct — do not mark it wrong for lacking one fixed answer. ' +
    'Reply as JSON: {"findings":[{"where":"...","problem":"..."}]} and list ONLY the ' +
    'pairs that are wrong. An empty list means everything checked out.';

  const user = `Subject: ${subject}\nYear group: ${year}\n\n` +
    pairs.map((p) => `[${p.where}]\nQ: ${p.q}\nA: ${p.a}`).join('\n\n');

  try {
    const res = await fetch(`${base.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model,
        messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
        temperature: 0,
        ...(Deno.env.get('AI_JSON_MODE') ? { response_format: { type: 'json_object' } } : {}),
      }),
      signal: AbortSignal.timeout(45000),
    });
    if (!res.ok) return { ran: false, findings: [], note: `verifier returned ${res.status}` };
    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content ?? '{}';
    const parsed = JSON.parse(String(text).replace(/^```(?:json)?|```$/g, '').trim());
    const found = (parsed.findings ?? []) as { where: string; problem: string }[];
    return {
      ran: true,
      findings: found.map((f) => ({
        level: 'blocker' as const,
        code: 'answer_wrong',
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
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  let payload: { plan_id?: string; body?: Record<string, unknown>; subject?: string;
                 year?: string; minutes?: number | null; model?: string };
  try {
    payload = await req.json();
  } catch {
    return json({ error: 'no_body' }, 400);
  }

  const db = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  let body = payload.body;
  let subject = payload.subject ?? '';
  let year = payload.year ?? '';
  let minutes = payload.minutes ?? null;
  let model = payload.model ?? '';

  // A plan id is enough; the rest is looked up. The lektionskollen schema is
  // not exposed to PostgREST by design, so this goes through its own function.
  if (!body && payload.plan_id) {
    const { data, error } = await db.rpc('lk_plan_for_verify', { p_id: payload.plan_id });
    if (error || !data) return json({ error: 'plan_not_found', detail: error?.message }, 404);
    body = data.body as Record<string, unknown>;
    subject = data.subject; year = data.year_group;
    minutes = data.minutes; model = data.model;
  }
  if (!body) return json({ error: 'no_plan' }, 400);

  const { data: structure, error: vErr } = await db.rpc('lk_validate_plan', {
    p_body: body, p_minutes: minutes,
  });
  if (vErr) return json({ error: vErr.message }, 500);

  // The written library's answers were written by a person; there is nothing
  // for a model to second-guess, and a check that always passes teaches a
  // coordinator to ignore checks.
  const subjectPass = model === 'canned'
    ? { ran: false, findings: [] as Finding[], note: 'written library — answers are human-written' }
    : await checkSubject(body, subject, year);

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
