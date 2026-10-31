// © 2026 Frånvarokollen Sverige AB. All rights reserved. Proprietary and confidential: see LICENSE.
// The request settings every model call shares. Each function decides its own
// prompt and its own token ceiling; these two it should not have to think about.

// Temperature is omitted unless AI_TEMPERATURE is set. Anthropic's OpenAI
// compatibility layer returns 400 for any value below 1 on current models, and
// every call used to pin it low — so every call would have failed the moment a
// Claude key was connected. Providers that do accept it (OpenAI, Gemini,
// OpenRouter) can have it back by setting the variable.
const AI_TEMP = Deno.env.get('AI_TEMPERATURE')
export const temperature = () => (AI_TEMP ? { temperature: Number(AI_TEMP) } : {})

// Thinking is on by default on Claude 5 models and is billed against the same
// max_tokens as the answer. Uncapped, the reasoning can use the whole budget:
// a plan came back truncated mid-JSON three times running, and short extras
// came back empty — which the substitute saw as the written fallback rather
// than as an error. OpenAI's reasoning_effort is ignored by the compatibility
// layer; the budget is set with a `thinking` field on the request instead.
//
// A provider that does not know the field may reject the whole request rather
// than ignore it, so by default this is only sent to Anthropic — where leaving
// it out is the broken case, not the safe one. AI_THINKING_BUDGET overrides it
// everywhere (0 turns thinking off).
//
// `forAnthropic` is the caller's budget: what its answer needs room for.
const AI_THINK = Deno.env.get('AI_THINKING_BUDGET')
const IS_ANTHROPIC = /api\.anthropic\.com/i.test(Deno.env.get('AI_BASE_URL') ?? '')
export const thinking = (forAnthropic: number) => {
  const budget = AI_THINK !== undefined ? Number(AI_THINK) : IS_ANTHROPIC ? forAnthropic : NaN
  if (!Number.isFinite(budget)) return {}
  return budget > 0
    ? { thinking: { type: 'enabled', budget_tokens: budget } }
    : { thinking: { type: 'disabled' } }
}
