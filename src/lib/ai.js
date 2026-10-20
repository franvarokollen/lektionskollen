// Single entry point for the UI. Picks direct (local model) or edge (Supabase) mode at call time.
import { generateLessonPlan } from '../../supabase/functions/_shared/generate.ts';
import { supabase } from './supabase.js';
import { getConfig } from './config.js';

let authToken = null;
/** Host-provided user token (FVK session). Used for the edge function in production. */
export function setAuthToken(token) {
  authToken = token || null;
}

export function aiLabel(cfg = getConfig()) {
  return cfg.aiMode === 'edge' ? 'Hosted (Supabase)' : `Local: ${cfg.model}`;
}

export async function requestLessonPlan(request, absenceRef) {
  const cfg = getConfig();

  if (cfg.aiMode === 'edge') {
    if (!supabase) throw new Error('Hosted mode is not configured in this build (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).');
    const { data, error } = await supabase.functions.invoke('generate-lesson', {
      body: { request, absenceRef },
      ...(authToken ? { headers: { Authorization: `Bearer ${authToken}` } } : {}),
    });
    if (error) {
      let msg = error.message;
      try { msg = (await error.context.json()).error || msg; } catch { /* keep default */ }
      throw new Error(msg);
    }
    if (data?.error) throw new Error(data.error);
    return data;
  }

  try {
    return await generateLessonPlan(request, {
      baseUrl: cfg.baseUrl,
      model: cfg.model,
      jsonMode: cfg.jsonMode,
    });
  } catch (e) {
    if (/Could not reach model/.test(e.message)) {
      throw new Error(`${e.message}. Is LM Studio/Ollama running with CORS enabled? On a hosted page, allow the browser's "local network access" prompt.`);
    }
    throw e;
  }
}
