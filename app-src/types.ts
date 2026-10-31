// © 2026 Frånvarokollen Sverige AB. All rights reserved. Proprietary and confidential: see LICENSE.
// The shapes the app passes around. The plan is the one that matters: it is what
// the model writes, what the bank stores, and what both hosts render.
//
// Every field is optional on purpose. A plan in the bank can be older than the
// field, and a model can leave a key out; the renderer has to cope with both, so
// the types say so instead of pretending the schema is always complete.

export type Lang = 'sv' | 'en';
export type Tier = 'support' | 'core' | 'extension';

export interface QA { q?: string; a?: string }
export interface Task extends QA { tier?: Tier }
export interface Phase {
  t?: string;      // time range, "00:00–00:08" (the plan's own clock)
  n?: string;      // name
  say?: string;
  pupils?: string;
  expect?: string;
  board?: string;
  checks?: QA[];
}
export interface ModelStep { b?: string; s?: string }
export interface WorkedExample { p?: string; st?: ModelStep[]; a?: string; tq?: string; ta?: string }
export interface Misconception { t?: string; w?: string; s?: string }
export interface Material { h?: string; body?: string }
export interface Equipment { need?: string; fallback?: string; where?: string }

export interface Plan {
  title?: string;
  curriculum?: string;
  goal?: string;
  criteria?: string[];
  readTime?: string;
  summary?: string;
  first90?: string[];
  board?: string;
  equipment?: Equipment;
  recall?: { why?: string; qs?: QA[] };
  model?: WorkedExample;
  misconceptions?: Misconception[];
  phases?: Phase[];
  materials?: Material[];
  tasks?: Task[];
  stuck?: string;
  ahead?: string;
  wrong?: string;
  exit?: QA;
  handover?: string;
}
