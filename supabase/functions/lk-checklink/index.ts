// Check a teacher's plan link at the moment it is pasted.
//
// The person who can fix a bad URL is the coordinator typing it, not the
// substitute meeting it at 08:15. So the check happens here, once, and its
// answer is advice rather than a gate: the coordinator may know the link is
// right and the checker wrong.
//
// WHAT IT CANNOT DO, stated plainly because the UI must not overclaim:
// a private Google Doc returns a perfectly healthy sign-in page, so "reachable"
// never means "the substitute will be able to read it". The only thing this
// rules out with confidence is a dead or mistyped address.

import { cors, json } from '../_shared/http.ts'

/** Private, loopback and link-local addresses, so this cannot be pointed inward. */
function isPrivateIp(ip: string): boolean {
  const h = ip.toLowerCase().replace(/^\[|\]$/g, '');
  // IPv4 written inside IPv6 (::ffff:127.0.0.1) is still IPv4.
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(h);
  if (mapped) return isPrivateIp(mapped[1]!);
  if (h === '::' || h === '::1' || /^f[cd]/.test(h) || /^fe[89ab]/.test(h) || h.startsWith('::ffff:')) return true;
  const v4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(h);
  if (v4) {
    const [a, b] = [Number(v4[1]), Number(v4[2])];
    if (a === 10 || a === 127 || a === 0 || a >= 224) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 169 && b === 254) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
  }
  return false;
}

function isPrivateName(host: string): boolean {
  const h = host.toLowerCase().replace(/^\[|\]$/g, '');
  return h === 'localhost' || h.endsWith('.localhost') || h.endsWith('.local') ||
    h.endsWith('.internal') || h.endsWith('.lan') || (!h.includes('.') && !h.includes(':'));
}

/** The name, and every address it resolves to, must be public. */
async function isPrivateHost(host: string): Promise<boolean> {
  const h = host.toLowerCase().replace(/^\[|\]$/g, '');
  if (isPrivateName(h) || isPrivateIp(h)) return true;
  if (/^[\d.]+$/.test(h) || h.includes(':')) return false;   // a public literal address
  const found: string[] = [];
  for (const kind of ['A', 'AAAA'] as const) {
    try { found.push(...await Deno.resolveDns(h, kind)); } catch { /* no records of this kind */ }
  }
  // A name that resolves to nothing is not private, just dead; fetch will say so.
  return found.some(isPrivateIp);
}

/** A sign-in wall is a fine answer for a link, and a bad one for a substitute. */
function looksLikeSignIn(finalUrl: string): boolean {
  return /accounts\.google\.com|login\.microsoftonline\.com|\/login|\/signin|\/sign-in/i.test(finalUrl);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  let url = '';
  try {
    ({ url } = await req.json());
  } catch {
    return json({ status: 'bad', reason: 'no_body' }, 400);
  }

  let target: URL;
  try {
    target = new URL(String(url || '').trim());
  } catch {
    return json({ status: 'bad', reason: 'not_a_url' });
  }
  if (target.protocol !== 'http:' && target.protocol !== 'https:') {
    return json({ status: 'bad', reason: 'not_http' });
  }
  if (await isPrivateHost(target.hostname)) {
    return json({ status: 'bad', reason: 'private_address' });
  }

  const stop = AbortSignal.timeout(6000);
  try {
    // GET rather than HEAD: plenty of document hosts answer HEAD with 405 while
    // serving the page perfectly well. The body is dropped unread. Redirects
    // are followed by hand, so every hop gets the same address check as the
    // first — otherwise a public page could bounce the check inward.
    let at = target;
    let res: Response | null = null;
    for (let hop = 0; hop < 6; hop++) {
      res = await fetch(at.toString(), {
        method: 'GET',
        redirect: 'manual',
        signal: stop,
        headers: { 'User-Agent': 'Lektionskollen link check' },
      });
      const next = res.status >= 300 && res.status < 400 ? res.headers.get('location') : null;
      if (!next) break;
      try { await res.body?.cancel(); } catch { /* already closed */ }
      let to: URL;
      try { to = new URL(next, at); } catch { return json({ status: 'unreachable', reason: 'bad_redirect' }); }
      if (to.protocol !== 'http:' && to.protocol !== 'https:') return json({ status: 'unreachable', reason: 'bad_redirect' });
      if (await isPrivateHost(to.hostname)) return json({ status: 'bad', reason: 'private_address' });
      at = to;
      res = null;
    }
    if (!res) return json({ status: 'unreachable', reason: 'too_many_redirects' });
    try { await res.body?.cancel(); } catch { /* already closed */ }

    const final = at.toString();
    if (res.status === 404 || res.status === 410) return json({ status: 'missing', code: res.status });
    if (res.status === 401 || res.status === 403) return json({ status: 'private', code: res.status, final });
    if (looksLikeSignIn(final)) return json({ status: 'private', code: res.status, final });
    if (res.status >= 500) return json({ status: 'unreachable', code: res.status });
    if (!res.ok) return json({ status: 'unreachable', code: res.status });
    return json({ status: 'ok', code: res.status, final });
  } catch (e) {
    const msg = String((e as Error)?.name || e);
    return json({ status: msg.includes('Timeout') ? 'slow' : 'unreachable', reason: msg });
  }
});
