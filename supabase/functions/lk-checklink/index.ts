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

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });

/** Private, loopback and link-local addresses, so this cannot be pointed inward. */
function isPrivateHost(host: string): boolean {
  const h = host.toLowerCase().replace(/^\[|\]$/g, '');
  if (h === 'localhost' || h.endsWith('.localhost') || h.endsWith('.local') ||
      h.endsWith('.internal') || h.endsWith('.lan') || !h.includes('.')) return true;
  if (h === '::1' || h.startsWith('fc') || h.startsWith('fd') || h.startsWith('fe80:')) return true;
  const v4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(h);
  if (v4) {
    const [a, b] = [Number(v4[1]), Number(v4[2])];
    if (a === 10 || a === 127 || a === 0) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 169 && b === 254) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
  }
  return false;
}

/** A sign-in wall is a fine answer for a link, and a bad one for a substitute. */
function looksLikeSignIn(finalUrl: string): boolean {
  return /accounts\.google\.com|login\.microsoftonline\.com|\/login|\/signin|\/sign-in/i.test(finalUrl);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

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
  if (isPrivateHost(target.hostname)) {
    return json({ status: 'bad', reason: 'private_address' });
  }

  const stop = AbortSignal.timeout(6000);
  try {
    // GET rather than HEAD: plenty of document hosts answer HEAD with 405 while
    // serving the page perfectly well. The body is dropped unread.
    const res = await fetch(target.toString(), {
      method: 'GET',
      redirect: 'follow',
      signal: stop,
      headers: { 'User-Agent': 'Lektionskollen link check' },
    });
    try { await res.body?.cancel(); } catch { /* already closed */ }

    const final = res.url || target.toString();
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
