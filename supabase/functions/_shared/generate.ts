// Provider-agnostic generation via the OpenAI-compatible chat API.
// One adapter covers: LM Studio, Ollama, OpenAI, Gemini (OpenAI-compat endpoint),
// xAI, and Anthropic's OpenAI-compat endpoint — so moving from local to a hosted
// key later is a config change, not a code change.

import { buildMessages, type LessonRequest } from './prompt.ts';
import { parseModelJson } from './json.ts';

export type AiConfig = {
  baseUrl: string;            // e.g. http://localhost:1234/v1
  model: string;
  apiKey?: string;            // not needed for local
  jsonMode?: 'json_object' | 'none';
  maxTokens?: number;
  temperature?: number;
  timeoutMs?: number;
};

export type GenerateResult = {
  plan: Record<string, unknown>;
  model: string;
  repaired: boolean;
  usage?: { prompt_tokens?: number; completion_tokens?: number };
  ms: number;
};

export async function generateLessonPlan(req: LessonRequest, cfg: AiConfig): Promise<GenerateResult> {
  const t0 = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), cfg.timeoutMs ?? 300_000);

  const body: Record<string, unknown> = {
    model: cfg.model,
    messages: buildMessages(req),
    temperature: cfg.temperature ?? 0.4,
    max_tokens: cfg.maxTokens ?? 8000,
    stream: false,
  };
  if (cfg.jsonMode === 'json_object') body.response_format = { type: 'json_object' };

  let res: Response;
  try {
    res = await fetch(`${cfg.baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(cfg.apiKey ? { Authorization: `Bearer ${cfg.apiKey}` } : {}),
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (e) {
    clearTimeout(timer);
    const msg = (e as Error).name === 'AbortError' ? 'Model timed out' : `Could not reach model at ${cfg.baseUrl}`;
    throw new Error(msg);
  }
  clearTimeout(timer);

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Model error ${res.status}: ${text.slice(0, 300)}`);
  }

  const json = await res.json();
  const content: string = json?.choices?.[0]?.message?.content ?? '';
  if (!content) throw new Error('Model returned an empty response');

  const { data, repaired } = parseModelJson(content);
  return { plan: data, model: json.model ?? cfg.model, repaired, usage: json.usage, ms: Date.now() - t0 };
}
