// ============================================================
// API layer — LLM providers (Gemini/Anthropic/OpenAI/Grok/Local) and
// Google Apps Script transport.
// Depends on: helpers.js (safeJsonParse)
// ============================================================

// ---- Apps Script transport ----
// text/plain avoids the CORS preflight Apps Script doesn't handle well.
window.postToAppsScript = async function postToAppsScript(url, payload) {
  if (!url) throw new Error("No Apps Script URL configured");
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Apps Script HTTP ${res.status}`);
  try { return await res.json(); } catch { return { ok: true }; }
};

window.getFromAppsScript = async function getFromAppsScript(url, params = {}) {
  if (!url) throw new Error("No Apps Script URL configured");
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(qs ? `${url}?${qs}` : url, { method: "GET" });
  if (!res.ok) throw new Error(`Apps Script HTTP ${res.status}`);
  return await res.json();
};

// ---- LLM provider callers ----
async function callGemini({ apiKey, prompt, model }) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model || "gemini-2.5-flash"}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 32768, responseMimeType: "application/json" },
    }),
  });
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
  return window.safeJsonParse(text);
}

async function callAnthropic({ apiKey, prompt, model }) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: model || "claude-sonnet-4-5-20250929",
      max_tokens: 16384,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const text = data.content.filter((b) => b.type === "text").map((b) => b.text).join("");
  return window.safeJsonParse(text);
}

async function callLocal({ baseUrl, apiKey, prompt, model }) {
  const url = `${baseUrl.replace(/\/$/, "")}/v1/chat/completions`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    },
    body: JSON.stringify({
      model: model || "local-model",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.8,
    }),
  });
  if (!res.ok) throw new Error(`Local ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content || "";
  return window.safeJsonParse(text);
}

// OpenAI and xAI both expose OpenAI-compatible /v1/chat/completions.
// `response_format: json_object` works on OpenAI and xAI ignores it cleanly.
async function callOpenAICompatible({ baseUrl, apiKey, prompt, model, providerLabel }) {
  const url = `${baseUrl}/v1/chat/completions`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: "You return only valid JSON with no markdown formatting." },
        { role: "user", content: prompt },
      ],
      temperature: 0.8,
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) {
    throw new Error(`${providerLabel} ${res.status}: ${await res.text()}`);
  }
  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content || "";
  return window.safeJsonParse(text);
}

async function callOpenAI({ apiKey, prompt, model }) {
  return callOpenAICompatible({
    baseUrl: "https://api.openai.com",
    apiKey, prompt,
    model: model || "gpt-5.5",
    providerLabel: "OpenAI",
  });
}

async function callGrok({ apiKey, prompt, model }) {
  return callOpenAICompatible({
    baseUrl: "https://api.x.ai",
    apiKey, prompt,
    model: model || "grok-4",
    providerLabel: "Grok",
  });
}

// Dispatch to the right provider based on config.provider.
window.runLLM = async function runLLM(config, prompt) {
  if (config.provider === "gemini") return callGemini({ apiKey: config.geminiKey, prompt, model: config.geminiModel });
  if (config.provider === "anthropic") return callAnthropic({ apiKey: config.anthropicKey, prompt, model: config.anthropicModel });
  if (config.provider === "openai") return callOpenAI({ apiKey: config.openaiKey, prompt, model: config.openaiModel });
  if (config.provider === "grok") return callGrok({ apiKey: config.grokKey, prompt, model: config.grokModel });
  if (config.provider === "local") return callLocal({ baseUrl: config.localUrl, apiKey: config.localKey, prompt, model: config.localModel });
  throw new Error("No provider configured");
};
