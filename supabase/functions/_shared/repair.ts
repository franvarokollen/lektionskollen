// © 2026 Frånvarokollen Sverige AB. All rights reserved. Proprietary and confidential: see LICENSE.
// Defensive handling of model output. Local models fence their JSON, emit
// <think> blocks, leave trailing commas and get cut off at the token limit.

export function asLine(v: unknown): string {
  if (v == null) return ''
  if (typeof v === 'string') return v
  if (typeof v === 'number' || typeof v === 'boolean') return String(v)
  if (Array.isArray(v)) return v.map(asLine).filter(Boolean).join(' · ')
  if (typeof v === 'object') {
    const o = v as Record<string, unknown>
    for (const k of ['text', 'content', 'value', 'description', 'name', 'title']) {
      if (typeof o[k] === 'string') return o[k] as string
    }
    return Object.values(o).map(asLine).filter(Boolean).join(' – ')
  }
  return String(v)
}

function isolate(raw: string): string {
  let s = raw.trim()
  s = s.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '')
  s = s.replace(/<think>[\s\S]*?<\/think>/gi, '')
  const i = s.indexOf('{')
  if (i === -1) throw new Error('No JSON object in model output')
  return s.slice(i)
}

function repairTruncated(s: string): string {
  const stack: string[] = []
  let inStr = false, esc = false, lastSafe = 0
  for (let i = 0; i < s.length; i++) {
    const c = s[i]
    if (inStr) {
      if (esc) esc = false
      else if (c === '\\') esc = true
      else if (c === '"') inStr = false
      continue
    }
    if (c === '"') inStr = true
    else if (c === '{' || c === '[') stack.push(c === '{' ? '}' : ']')
    else if (c === '}' || c === ']') {
      stack.pop(); lastSafe = i + 1
      if (stack.length === 0) return s.slice(0, i + 1)
    } else if (c === ',') lastSafe = i
  }
  let out = s.slice(0, lastSafe || s.length).replace(/,\s*$/, '')
  const st: string[] = []
  inStr = false; esc = false
  for (const c of out) {
    if (inStr) {
      if (esc) esc = false
      else if (c === '\\') esc = true
      else if (c === '"') inStr = false
      continue
    }
    if (c === '"') inStr = true
    else if (c === '{' || c === '[') st.push(c === '{' ? '}' : ']')
    else if (c === '}' || c === ']') st.pop()
  }
  if (inStr) out += '"'
  return out + st.reverse().join('')
}

export function parseModelJson<T = Record<string, unknown>>(raw: string): { data: T; repaired: boolean } {
  const obj = isolate(raw)
  try {
    return { data: JSON.parse(obj) as T, repaired: false }
  } catch {
    const fixed = repairTruncated(obj).replace(/,\s*([}\]])/g, '$1')
    return { data: JSON.parse(fixed) as T, repaired: true }
  }
}
