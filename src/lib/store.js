// Phase 1 storage: localStorage. Phase 2 swaps this module for Supabase tables
// (lesson_requests / lesson_plans) behind the same function signatures.

const KEY = 'lk.plans.v1';

function readAll() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]');
  } catch {
    return [];
  }
}

function writeAll(list) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* storage full / blocked – keep in memory only */
  }
}

export function listPlans() {
  return readAll().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getPlanForAbsence(absenceRef) {
  return readAll().find((p) => p.absenceRef === absenceRef) || null;
}

export function savePlan({ absenceRef, request, result }) {
  const list = readAll().filter((p) => !absenceRef || p.absenceRef !== absenceRef);
  const record = {
    id: crypto.randomUUID(),
    absenceRef: absenceRef || null,
    request,
    plan: result.plan,
    model: result.model,
    repaired: result.repaired,
    ms: result.ms,
    createdAt: new Date().toISOString(),
  };
  list.push(record);
  writeAll(list);
  return record;
}

export function deletePlan(id) {
  writeAll(readAll().filter((p) => p.id !== id));
}
