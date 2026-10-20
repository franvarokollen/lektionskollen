// Runtime AI config. Precedence: host init message > localStorage (test harness) > build env.
// Lets the same build switch between a local model and the hosted edge function.

const env = import.meta.env;
const KEY = 'lk.config.v1';

export const DEFAULT_CONFIG = {
  aiMode: env.VITE_AI_MODE || 'direct',                       // 'direct' (local model) | 'edge' (Supabase)
  baseUrl: env.VITE_AI_BASE_URL || 'http://localhost:1234/v1',
  model: env.VITE_AI_MODEL || 'qwen2.5-14b-instruct',
  jsonMode: env.VITE_AI_JSON_MODE || 'none',
};

let override = {};

function stored() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '{}');
  } catch {
    return {};
  }
}

export function getConfig() {
  return { ...DEFAULT_CONFIG, ...stored(), ...override };
}

/** Persist settings (test harness). */
export function saveConfig(cfg) {
  try {
    localStorage.setItem(KEY, JSON.stringify(cfg));
  } catch {
    /* ignore */
  }
}

/** Per-session override from the host's init message (not persisted). */
export function setConfigOverride(partial = {}) {
  const allowed = ['aiMode', 'baseUrl', 'model', 'jsonMode'];
  override = Object.fromEntries(Object.entries(partial).filter(([k, v]) => allowed.includes(k) && v));
}

export const hostedAvailable = () => Boolean(env.VITE_SUPABASE_URL && env.VITE_SUPABASE_ANON_KEY);
