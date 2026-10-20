// Supabase Edge Function: generate-lesson
// POST { request: LessonRequest, absenceRef?: string }
// Config via function secrets (supabase/functions/.env locally):
//   AI_BASE_URL, AI_MODEL, AI_API_KEY (optional), AI_JSON_MODE (json_object|none)
// Local dev against a model on your machine: AI_BASE_URL=http://host.docker.internal:1234/v1

import { createClient } from 'npm:@supabase/supabase-js@2';
import { generateLessonPlan } from '../_shared/generate.ts';
import type { LessonRequest } from '../_shared/prompt.ts';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  let payload: { request?: LessonRequest; absenceRef?: string };
  try {
    payload = await req.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }
  const r = payload.request;
  if (!r?.subject || !r?.yearGroup || !r?.durationMinutes) {
    return json({ error: 'subject, yearGroup and durationMinutes are required' }, 400);
  }

  const baseUrl = Deno.env.get('AI_BASE_URL');
  const model = Deno.env.get('AI_MODEL');
  if (!baseUrl || !model) return json({ error: 'AI_BASE_URL / AI_MODEL not configured' }, 500);

  // Caller identity (JWT verified by the platform). Used for metering + persistence.
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  });

  try {
    const result = await generateLessonPlan(r, {
      baseUrl,
      model,
      apiKey: Deno.env.get('AI_API_KEY') ?? undefined,
      jsonMode: (Deno.env.get('AI_JSON_MODE') as 'json_object' | 'none') ?? 'none',
    });

    // Best-effort usage log (RLS decides if this caller may write). Never blocks the response.
    supabase
      .from('usage_events')
      .insert({
        absence_ref: payload.absenceRef ?? null,
        model: result.model,
        prompt_tokens: result.usage?.prompt_tokens ?? null,
        completion_tokens: result.usage?.completion_tokens ?? null,
        duration_ms: result.ms,
      })
      .then(() => {}, () => {});

    return json(result);
  } catch (e) {
    return json({ error: (e as Error).message }, 502);
  }
});
