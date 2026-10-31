// © 2026 Frånvarokollen Sverige AB. All rights reserved. Proprietary and confidential: see LICENSE.
/* ── Sign-in: mocked (option A) ──────────────────────
   Lektionskollen is its own product with its own sign-in, and can be linked
   to Frånvarokollen. The plan (docs/AUTH.md):

     standalone  Supabase Auth on LK's own project — Google, Microsoft
                 (provider 'azure') or an emailed link
     linked      FVK's server mints a short-lived LK session for the signed-in
                 coordinator; the panel opens already signed in

   Nothing here talks to an identity provider yet. Every button lands in the
   shared demo school, exactly as before; the screen exists so the flow can be
   judged and the real calls dropped in at the marked lines without touching
   anything else. */
import { boot } from './lk';
import { $, esc, maybe$, t, toast } from './lk-core';
import { EMBED } from './lk-embed';
import { applyStatic } from './lk-shell';
export type AuthMethod = 'google' | 'microsoft' | 'email' | 'demo' | 'fvk';
interface MockAuth { method: AuthMethod; email?: string }
export const AUTH_KEY = 'lk.mockAuth';

export function mockAuth(): MockAuth | null {
  if (EMBED) return { method: 'fvk' };   // later: session handed over by FVK (setSession)
  try { return JSON.parse(localStorage.getItem(AUTH_KEY) || 'null'); } catch { return null; }
}

export function showSignIn() {
  $('signin').hidden = false;
  applyStatic();
}

export function mockSignIn(method: AuthMethod) {
  // Real calls, when the time comes:
  //   google     sb.auth.signInWithOAuth({ provider: 'google' })
  //   microsoft  sb.auth.signInWithOAuth({ provider: 'azure', options: { scopes: 'email' } })
  //   email      sb.auth.signInWithOtp({ email })
  //   then       lk_me() resolves the school from members; no member → "ask your coordinator"
  let email: string | undefined;
  if (method === 'email') {
    email = maybe$<HTMLInputElement>('si-email')?.value.trim() || '';
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { toast(t('siBadEmail')); return; }
  }
  try { localStorage.setItem(AUTH_KEY, JSON.stringify({ method, email })); } catch { /* private window */ }
  $('signin').hidden = true;
  boot();
}

export function authLabel(): string {
  const a = mockAuth();
  if (!a) return '';
  return t('via_' + a.method) + (a.email ? ' · ' + a.email : '');
}

/** Settings: where the FVK link will live. Static until the bridge exists. */
export function fvkLinkCard() {
  return '<h4 style="margin-top:18px">' + esc(t('fvkLinkTitle')) + '</h4>' +
    '<p class="hint">' + esc(t('fvkLinkNote')) + '</p>' +
    '<div class="covrow"><span class="chip chip-neutral">' + esc(t(EMBED ? 'fvkLinked' : 'fvkNotLinked')) + '</span>' +
    (EMBED ? '' : '<button data-fvklink>' + esc(t('fvkLinkBtn')) + '</button>') + '</div>';
}
