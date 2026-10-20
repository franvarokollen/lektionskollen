// Mock FVK: a stand-in host that embeds the add-in exactly as FVK will (iframe + postMessage).
import { useCallback, useMemo, useState } from 'react';
import { LangContext, STRINGS } from '../lib/i18n.js';
import { aiLabel } from '../lib/ai.js';
import { getConfig } from '../lib/config.js';
import { listPlans, deletePlan } from '../lib/store.js';
import { MOCK_ABSENCES } from '../data/mockAbsences.js';
import AbsenceList from '../components/AbsenceList.jsx';
import PlanLibrary from '../components/PlanLibrary.jsx';
import AddinFrame from './AddinFrame.jsx';
import SettingsPanel from './SettingsPanel.jsx';
import EventLog from './EventLog.jsx';

let seq = 0;

export default function HarnessApp() {
  const [lang, setLangState] = useState(() => {
    try { return localStorage.getItem('lk.lang') || 'sv'; } catch { return 'sv'; }
  });
  const setLang = (l) => { setLangState(l); try { localStorage.setItem('lk.lang', l); } catch { /* ignore */ } };
  const t = STRINGS[lang];
  const ctx = useMemo(() => ({ lang, t, setLang }), [lang, t]);

  const [tab, setTab] = useState('absences');
  const [cfg, setCfg] = useState(getConfig);
  const [showSettings, setShowSettings] = useState(false);
  const [plans, setPlans] = useState(listPlans);
  const [frameInit, setFrameInit] = useState(null);
  const [events, setEvents] = useState([]);
  const [toast, setToast] = useState(null);

  const refresh = () => setPlans(listPlans());
  const planByAbsence = Object.fromEntries(plans.filter((p) => p.absenceRef).map((p) => [p.absenceRef, p]));

  const open = (mode, absence, planId) =>
    setFrameInit({ mode, absence, planId, lang, ai: getConfig(), token: null });

  const onEvent = useCallback((type, payload, dir) => {
    if (type !== 'lk:resize') setEvents((ev) => [{ id: ++seq, type, payload, dir, time: new Date().toLocaleTimeString('sv-SE') }, ...ev].slice(0, 100));
    if (type === 'lk:plan-created') setPlans(listPlans());
    if (type === 'lk:send-to-sub') {
      const abs = MOCK_ABSENCES.find((a) => a.id === payload.absenceRef);
      setToast(abs?.cover
        ? `FVK would now email/SMS the plan link to ${abs.cover} for ${abs.group} ${abs.time}.`
        : 'No cover assigned yet – FVK would ask the coordinator to pick a vikarie first.');
      setTimeout(() => setToast(null), 6000);
    }
  }, []);

  const closeFrame = useCallback(() => { setFrameInit(null); setPlans(listPlans()); }, []);

  return (
    <LangContext.Provider value={ctx}>
      <div className="app">
        <div className="harness-banner">
          <strong>Test harness</strong> – this page plays the part of the Frånvarokollen app. The add-in opens in an iframe, exactly as it will inside FVK.
        </div>

        <header className="topbar">
          <div>
            <h1>Frånvarokollen <span className="muted-inline">(mock)</span></h1>
            <p className="muted">{t.appSub}</p>
          </div>
          <div className="topbar-right">
            <button className={`pill ${cfg.aiMode}`} onClick={() => setShowSettings(true)} title="Change AI source">
              ⚙ {aiLabel(cfg)}
            </button>
            <button className="btn ghost" onClick={() => setLang(lang === 'sv' ? 'en' : 'sv')}>{lang === 'sv' ? 'EN' : 'SV'}</button>
          </div>
        </header>

        <nav className="tabs">
          <button className={tab === 'absences' ? 'active' : ''} onClick={() => setTab('absences')}>{t.tabAbsences}</button>
          <button className={tab === 'library' ? 'active' : ''} onClick={() => setTab('library')}>
            {t.tabLibrary} <span className="count">{plans.length}</span>
          </button>
        </nav>

        <main>
          {tab === 'absences' ? (
            <AbsenceList
              absences={MOCK_ABSENCES}
              planByAbsence={planByAbsence}
              onRequest={(a) => open('request', a)}
              onView={(p) => open('view', MOCK_ABSENCES.find((a) => a.id === p.absenceRef), p.id)}
            />
          ) : (
            <PlanLibrary
              plans={plans}
              onView={(p) => open('view', MOCK_ABSENCES.find((a) => a.id === p.absenceRef), p.id)}
              onDelete={(id) => { deletePlan(id); refresh(); }}
            />
          )}

          <EventLog events={events} onClear={() => setEvents([])} />
        </main>

        {frameInit && <AddinFrame init={frameInit} onEvent={onEvent} onClose={closeFrame} />}
        {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} onSaved={setCfg} />}
        {toast && <div className="toast">{toast}</div>}
      </div>
    </LangContext.Provider>
  );
}
