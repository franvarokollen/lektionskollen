// Single entry point for the UI. Picks direct (local model) or edge (Supabase) mode.
import { generateLessonPlan } from '../../supabase/functions/_shared/generate.ts';
import { supabase } from './supabase.js';

const env = import.meta.env;
export const AI_MODE = env.VITE_AI_MODE || 'direct';

export function aiLabel() {
  return AI_MODE === 'edge' ? 'Supabase edge' : `Lokal: ${env.VITE_AI_MODEL || '?'}`;
}

export async function requestLessonPlan(request, absenceRef) {
  if (AI_MODE === 'edge') {
    if (!supabase) throw new Error('Supabase är inte konfigurerat (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)');
    const { data, error } = await supabase.functions.invoke('generate-lesson', {
      body: { request, absenceRef },
    });
    if (error) {
      let msg = error.message;
      try { msg = (await error.context.json()).error || msg; } catch { /* keep default */ }
      throw new Error(msg);
    }
    if (data?.error) throw new Error(data.error);
    return data;
  }

  return generateLessonPlan(request, {
    baseUrl: env.VITE_AI_BASE_URL || 'http://localhost:1234/v1',
    model: env.VITE_AI_MODEL || 'local-model',
    jsonMode: env.VITE_AI_JSON_MODE || 'none',
  });
}
