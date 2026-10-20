// postMessage bridge between the add-in (iframe) and its host (FVK, or the test harness).
// Contract documented in docs/EMBED.md — keep the two in sync.

export const PROTOCOL = 'lektionskollen/1';

// Origins allowed to host the add-in. "*" only for the test build.
const ALLOWED = (import.meta.env.VITE_ALLOWED_HOST_ORIGINS || '*')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

let hostOrigin = null;

function originAllowed(origin) {
  return ALLOWED.includes('*') || ALLOWED.includes(origin);
}

/** Add-in → host */
export function emit(type, payload = {}) {
  if (window.parent === window) return; // not embedded
  window.parent.postMessage({ protocol: PROTOCOL, type, payload }, hostOrigin || '*');
}

/** Add-in: listen for host messages. Returns an unsubscribe fn. */
export function onHostMessage(handler) {
  const fn = (e) => {
    const m = e.data;
    if (!m || m.protocol !== PROTOCOL || !originAllowed(e.origin)) return;
    if (m.type === 'lk:init') hostOrigin = e.origin; // lock replies to the host that initialised us
    handler(m.type, m.payload || {}, e.origin);
  };
  window.addEventListener('message', fn);
  return () => window.removeEventListener('message', fn);
}

/** Host side helper (used by the test harness; FVK implements the same thing). */
export function sendToAddin(iframe, type, payload = {}) {
  iframe?.contentWindow?.postMessage({ protocol: PROTOCOL, type, payload }, '*');
}
