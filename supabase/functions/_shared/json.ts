// Defensive JSON handling for LLM output.
// Shared by the browser (direct mode) and the Edge Function (Deno).

/** Coerce anything an LLM returns into a renderable line of text. */
export function asLine(v: unknown): string {
  if (v == null) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (Array.isArray(v)) return v.map(asLine).filter(Boolean).join(' · ');
  if (typeof v === 'object') {
    const o = v as Record<string, unknown>;
    for (const k of ['text', 'content', 'value', 'description', 'name', 'title']) {
      if (typeof o[k] === 'string') return o[k] as string;
    }
    return Object.values(o).map(asLine).filter(Boolean).join(' – ');
  }
  return String(v);
}

/** Coerce to an array (LLMs sometimes return a single object or a string). */
export function asList<T = unknown>(v: unknown): T[] {
  if (v == null) return [];
  if (Array.isArray(v)) return v as T[];
  if (typeof v === 'string') return v.split(/\n+/).map((s) => s.replace(/^[-*•\d.)\s]+/, '').trim()).filter(Boolean) as T[];
  return [v as T];
}

/** Strip code fences / prose and return the outermost JSON object text. */
function isolateObject(raw: string): string {
  let s = raw.trim();
  s = s.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '');
  // Remove <think>...</think> blocks some local reasoning models emit
  s = s.replace(/<think>[\s\S]*?<\/think>/gi, '');
  const start = s.indexOf('{');
  if (start === -1) throw new Error('No JSON object found in model output');
  return s.slice(start);
}

/** Close unterminated strings/brackets left by token-limit truncation. */
function repairTruncated(s: string): string {
  const stack: string[] = [];
  let inStr = false;
  let esc = false;
  let lastSafe = 0; // index after the last completed value at any depth

  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === '\\') esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') inStr = true;
    else if (c === '{' || c === '[') stack.push(c === '{' ? '}' : ']');
    else if (c === '}' || c === ']') {
      stack.pop();
      lastSafe = i + 1;
      if (stack.length === 0) return s.slice(0, i + 1); // complete object, ignore trailing junk
    } else if (c === ',') lastSafe = i;
  }

  // Truncated: cut back to the last safe point, then close everything still open.
  let out = s.slice(0, lastSafe || s.length);
  out = out.replace(/,\s*$/, '');
  // Recompute open brackets for the trimmed string
  const st: string[] = [];
  inStr = false;
  esc = false;
  for (const c of out) {
    if (inStr) {
      if (esc) esc = false;
      else if (c === '\\') esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') inStr = true;
    else if (c === '{' || c === '[') st.push(c === '{' ? '}' : ']');
    else if (c === '}' || c === ']') st.pop();
  }
  if (inStr) out += '"';
  return out + st.reverse().join('');
}

/** Parse model output into an object, repairing common breakage. */
export function parseModelJson<T = Record<string, unknown>>(raw: string): { data: T; repaired: boolean } {
  const obj = isolateObject(raw);
  try {
    return { data: JSON.parse(obj) as T, repaired: false };
  } catch {
    const fixed = repairTruncated(obj).replace(/,\s*([}\]])/g, '$1');
    return { data: JSON.parse(fixed) as T, repaired: true };
  }
}
