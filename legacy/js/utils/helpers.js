// ============================================================
// Pure helpers — no React, no DOM.
// ============================================================

// asLine: coerce arbitrary LLM output (string, number, or object) into a
// renderable string. Prevents React error #31 when models return shapes
// like {studentSays, teacherResponse} instead of a plain string in arrays
// such as anticipatedResponses, teacherDoes, studentsDo, etc.
window.asLine = function asLine(item) {
  if (item == null) return "";
  if (typeof item === "string") return item;
  if (typeof item === "number" || typeof item === "boolean") return String(item);
  if (typeof item === "object") {
    if ("studentSays" in item && "teacherResponse" in item) {
      return `${item.studentSays} → ${item.teacherResponse}`;
    }
    if ("student" in item && "teacher" in item) {
      return `${item.student} → ${item.teacher}`;
    }
    if ("text" in item && typeof item.text === "string") return item.text;
    if ("description" in item && typeof item.description === "string") {
      return item.title ? `${item.title}: ${item.description}` : item.description;
    }
    if ("title" in item && typeof item.title === "string") return item.title;
    const strs = Object.values(item).filter(v => typeof v === "string");
    if (strs.length) return strs.join(" — ");
    try { return JSON.stringify(item); } catch { return "[object]"; }
  }
  return String(item);
};

// safeJsonParse: strip ```json fences, attempt repair if truncated.
// Used on every LLM response since models sometimes cut off mid-JSON.
window.safeJsonParse = function safeJsonParse(text) {
  const cleaned = text.replace(/```json|```/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    // Fallback: try to repair truncated JSON.
    let repaired = cleaned.replace(/,\s*$/, "");
    let inString = false;
    let escape = false;
    let lastSafeIdx = 0;
    for (let i = 0; i < repaired.length; i++) {
      const c = repaired[i];
      if (escape) { escape = false; continue; }
      if (c === "\\") { escape = true; continue; }
      if (c === '"') { inString = !inString; if (!inString) lastSafeIdx = i + 1; }
      else if (!inString && (c === "}" || c === "]" || c === ",")) lastSafeIdx = i + 1;
    }
    repaired = repaired.slice(0, lastSafeIdx).replace(/,\s*$/, "");
    const stack = [];
    for (const c of repaired) {
      if (c === "{") stack.push("}");
      else if (c === "[") stack.push("]");
      else if (c === "}" || c === "]") stack.pop();
    }
    while (stack.length) repaired += stack.pop();
    try {
      return JSON.parse(repaired);
    } catch (e2) {
      throw new Error(`Modellen returnerade ofullständig JSON. Försök igen, eller välj en annan modell. (${e.message})`);
    }
  }
};

// similarityRatio: Levenshtein-based similarity in [0,1]. 1.0 = identical.
// Used by the school picker to flag near-duplicate school names.
window.similarityRatio = function similarityRatio(a, b) {
  const s1 = String(a || "").trim().toLowerCase();
  const s2 = String(b || "").trim().toLowerCase();
  if (!s1 && !s2) return 1;
  if (!s1 || !s2) return 0;
  const m = s1.length, n = s2.length;
  let prev = new Array(n + 1).fill(0);
  let curr = new Array(n + 1).fill(0);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  const dist = prev[n];
  const maxLen = Math.max(m, n);
  return maxLen === 0 ? 1 : 1 - dist / maxLen;
};
