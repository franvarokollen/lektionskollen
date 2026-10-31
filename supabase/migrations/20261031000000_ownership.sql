-- Ownership and copyright notices on the database itself. Comments travel with
-- a schema dump, so a copy of this database says whose it is.
-- Do not change or remove the reference in the schema comment: it is
-- referenced outside this repository.
comment on schema lektionskollen is
  'Lektionskollen (ref 4a6d11a3). © 2026 Frånvarokollen Sverige AB. All rights reserved. Proprietary and confidential.';
comment on function public.lk_pool(text, text, text, text, text) is
  'Lektionskollen plan pool ranking. © 2026 Frånvarokollen Sverige AB. Proprietary.';
comment on function public.lk_validate_plan(jsonb, integer) is
  'Lektionskollen plan validation. © 2026 Frånvarokollen Sverige AB. Proprietary.';
