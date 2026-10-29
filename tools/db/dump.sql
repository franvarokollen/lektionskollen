-- Everything Lektionskollen owns in the shared Supabase database, as one JSON
-- document. Run it in the SQL editor (or execute_sql), save the result as
-- dump.json, then:  node tools/db/baseline.mjs dump.json > supabase/migrations/<stamp>_lk_baseline.sql
--
-- The database is shared with other products (CRM, invoicing …), so this takes
-- only the lektionskollen schema, the public.lk_* functions and the lk-* cron jobs.
with fns as (
  select p.oid, n.nspname, p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'lektionskollen' or (n.nspname = 'public' and p.proname like 'lk\_%')
)
select jsonb_build_object(
 'tables', (select jsonb_agg(jsonb_build_object('t', c.relname, 'cols',
     (select jsonb_agg(jsonb_build_object('n', a.attname, 'ty', format_type(a.atttypid, a.atttypmod),
              'd', pg_get_expr(d.adbin, d.adrelid), 'nn', a.attnotnull, 'id', a.attidentity) order by a.attnum)
        from pg_attribute a left join pg_attrdef d on d.adrelid = a.attrelid and d.adnum = a.attnum
       where a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped),
     'rls', c.relrowsecurity) order by c.relname)
   from pg_class c where c.relnamespace = 'lektionskollen'::regnamespace and c.relkind = 'r'),
 'seqs', (select jsonb_agg(jsonb_build_object('s', s.relname, 'owner',
     (select t.relname || '.' || a.attname from pg_depend dp join pg_class t on t.oid = dp.refobjid
        join pg_attribute a on a.attrelid = t.oid and a.attnum = dp.refobjsubid
       where dp.objid = s.oid and dp.deptype in ('a', 'i') limit 1)))
   from pg_class s where s.relnamespace = 'lektionskollen'::regnamespace and s.relkind = 'S'),
 'cons', (select jsonb_agg(jsonb_build_object('tbl', conrelid::regclass::text, 'n', conname, 'type', contype,
            'def', pg_get_constraintdef(oid), 'valid', convalidated) order by contype <> 'p', contype = 'f', conname)
   from pg_constraint where connamespace = 'lektionskollen'::regnamespace and contype in ('p', 'u', 'c', 'f')),
 'idx', (select jsonb_agg(pg_get_indexdef(i.indexrelid) order by 1) from pg_index i join pg_class c on c.oid = i.indexrelid
   where c.relnamespace = 'lektionskollen'::regnamespace and not exists (select 1 from pg_constraint where conindid = i.indexrelid)),
 'fns', (select jsonb_agg(jsonb_build_object('sig', f.nspname || '.' || f.proname || '(' || pg_get_function_identity_arguments(f.oid) || ')',
            'def', pg_get_functiondef(f.oid),
            'acl', (select jsonb_agg(distinct coalesce(r.rolname, 'public'))
                      from aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) x
                      left join pg_roles r on r.oid = x.grantee where x.privilege_type = 'EXECUTE'))
          order by f.nspname desc, f.proname)
   from fns f join pg_proc p on p.oid = f.oid),
 'trg', (select jsonb_agg(pg_get_triggerdef(t.oid) order by t.tgname) from pg_trigger t join pg_class c on c.oid = t.tgrelid
   where c.relnamespace = 'lektionskollen'::regnamespace and not t.tgisinternal),
 'cron', (select jsonb_agg(jsonb_build_object('n', jobname, 's', schedule, 'c', command)) from cron.job where jobname like 'lk%')
)::text as dump;
