// The add-in FVK embeds. Everything it needs arrives in the host's `lk:init` message;
// everything FVK needs back goes out as events. See docs/EMBED.md.
import { useEffect, useMemo, useState } from 'react';
import { LangContext, STRINGS } from '../lib/i18n.js';
import { emit, onHostMessage, PROTOCOL } from '../lib/bridge.js';
import { setConfigOverride } from '../lib/config.js';
import { setAuthToken } from '../lib/ai.js';
import { getPlan, getPlanForAbsence } from '../lib/store.js';
import RequestModal from '../components/RequestModal.jsx';
import PlanView from '../components/PlanView.jsx';

/** Standalone fallback for quick testing without a host: embed.html?absence=<json>&lang=sv */
function initFromUrl() {
  const q = new URLSearchParams(location.search);
  const raw = q.get('absence');
  if (!raw) return null;
  try {
    return { mode: q.get('mode') || 'request', absence: JSON.parse(raw), lang: q.get('lang') || 'sv' };
  } catch {
    return null;
  }
}

export default function EmbedApp() {
  const [init, setInit] = useState(() => (window.parent === window ? initFromUrl() : null));
  const [view, setView] = useState(null);     // 'request' | 'plan'
  const [record, setRecord] = useState(null);
  const [lang, setLang] = useState('sv');

  // Handshake: announce, then wait for lk:init (re-init allowed for reuse of one iframe)
  useEffect(() => {
    const off = onHostMessage((type, payload) => {
      if (type === 'lk:init') setInit(payload);
      if (type === 'lk:set-lang' && STRINGS[payload.lang]) setLang(payload.lang);
    });
    emit('lk:ready', { protocol: PROTOCOL });
    return off;
  }, []);

  // Apply init
  useEffect(() => {
    if (!init) return;
    if (STRINGS[init.lang]) setLang(init.lang);
    setAuthToken(init.token);
    setConfigOverride(init.ai);
    const existing = init.planId ? getPlan(init.planId) : init.absence?.id ? getPlanForAbsence(init.absence.id) : null;
    if (init.mode === 'view' && existing) {
      setRecord(existing);
      setView('plan');
    } else if (init.mode === 'view') {
      emit('lk:error', { code: 'plan_not_found', message: 'No plan found for this absence' });
      setView('request');
    } else {
      setView('request');
    }
  }, [init]);

  // Report content height so the host can size the iframe if it wants to
  useEffect(() => {
    const ro = new ResizeObserver(() => emit('lk:resize', { height: document.documentElement.scrollHeight }));
    ro.observe(document.body);
    return () => ro.disconnect();
  }, []);

  const ctx = useMemo(() => ({ lang, t: STRINGS[lang], setLang }), [lang]);
  const close = () => emit('lk:close', {});

  return (
    <LangContext.Provider value={ctx}>
      <div className="embedded">
        {!init && <div className="waiting">Lektionskollen · waiting for host (lk:init)…</div>}

        {init && view === 'request' && init.absence && (
          <RequestModal
            absence={init.absence}
            onClose={close}
            onDone={(rec) => {
              setRecord(rec);
              setView('plan');
              emit('lk:plan-created', {
                absenceRef: rec.absenceRef,
                planId: rec.id,
                title: rec.plan?.title ?? null,
                model: rec.model,
                durationMs: rec.ms,
              });
            }}
          />
        )}

        {init && view === 'request' && !init.absence && (
          <div className="waiting">lk:init is missing "absence"</div>
        )}

        {init && view === 'plan' && record && (
          <PlanView
            record={record}
            onClose={close}
            onRegenerate={init.absence ? () => setView('request') : undefined}
            onSend={(rec) => emit('lk:send-to-sub', { absenceRef: rec.absenceRef, planId: rec.id, title: rec.plan?.title ?? null })}
          />
        )}
      </div>
    </LangContext.Provider>
  );
}
