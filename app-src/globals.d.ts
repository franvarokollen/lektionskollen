// © 2026 Frånvarokollen Sverige AB. All rights reserved. Proprietary and confidential: see LICENSE.
// What the page provides before this code runs. The supabase client comes from
// the CDN <script> in <head>; typing the little of it we use keeps a typo in an
// rpc name or a result field from compiling.
interface SbResult<T = unknown> { data: T; error: { message: string } | null }
interface SbQuery<T = unknown> extends PromiseLike<SbResult<T>> {
  select(cols?: string): SbQuery<T>;
  eq(col: string, v: unknown): SbQuery<T>;
  in(col: string, v: unknown[]): SbQuery<T>;
  order(col: string, o?: { ascending?: boolean }): SbQuery<T>;
  limit(n: number): SbQuery<T>;
}
interface SbClient {
  rpc(fn: string, args?: Record<string, unknown>): PromiseLike<SbResult<any>>;
  functions: { invoke(fn: string, o?: { body?: unknown }): PromiseLike<SbResult<any>> };
  from(table: string): SbQuery<any[]>;
}
interface Window { supabase: { createClient(url: string, key: string): SbClient } }
