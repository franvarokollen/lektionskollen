import { useMemo, useState } from 'react';
import { LangContext, STRINGS } from './lib/i18n.js';
import { aiLabel } from './lib/ai.js';
import { listPlans, deletePlan } from './lib/store.js';
import { MOCK_ABSENCES } from './data/mockAbsences.js';
import AbsenceList from './components/AbsenceList.jsx';
import RequestModal from './components/RequestModal.jsx';
import PlanView from './components/PlanView.jsx';
import PlanLibrary from './components/PlanLibrary.jsx';

export default function App() {
  const [lang, setLang] = useState(() => {
    try { return localStorage.getItem('lk.lang') || 'sv'; } catch { return 'sv'; }
  });
  const t = STRINGS[lang];
  const ctx = useMemo(() => ({
    lang,
    t,
    setLang: (l) => { setLang(l); try { localStorage.setItem('lk.lang', l); } catch { /* ignore */ } },
  }), [lang, t]);

  const [tab, setTab] = useState('absences');
  const [plans, setPlans] = useState(listPlans);
  const [requestFor, setRequestFor] = useState(null);   // absence object
  const [viewing, setViewing] = useState(null);         // plan record

  const refresh = () => setPlans(listPlans());
  const planByAbsence = Object.fromEntries(plans.filter((p) => p.absenceRef).map((p) => [p.absenceRef, p]));

  return (
    <LangContext.Provider value={ctx}>
      <div className="app">
        <header className="topbar no-print">
          <div>
            <h1>Lektionskollen</h1>
            <p className="muted">{t.appSub}</p>
          </div>
          <div className="topbar-right">
            <span className="pill">{aiLabel()}</span>
            <button className="btn ghost" onClick={() => ctx.setLang(lang === 'sv' ? 'en' : 'sv')}>
              {lang === 'sv' ? 'EN' : 'SV'}
            </button>
          </div>
        </header>

        <nav className="tabs no-print">
          <button className={tab === 'absences' ? 'active' : ''} onClick={() => setTab('absences')}>{t.tabAbsences}</button>
          <button className={tab === 'library' ? 'active' : ''} onClick={() => setTab('library')}>
            {t.tabLibrary} <span className="count">{plans.length}</span>
          </button>
        </nav>

        <main className="no-print">
          {tab === 'absences' ? (
            <AbsenceList
              absences={MOCK_ABSENCES}
              planByAbsence={planByAbsence}
              onRequest={setRequestFor}
              onView={setViewing}
            />
          ) : (
            <PlanLibrary
              plans={plans}
              onView={setViewing}
              onDelete={(id) => { deletePlan(id); refresh(); }}
            />
          )}
        </main>

        {requestFor && (
          <RequestModal
            absence={requestFor}
            onClose={() => setRequestFor(null)}
            onDone={(record) => { refresh(); setRequestFor(null); setViewing(record); }}
          />
        )}

        {viewing && (
          <PlanView
            record={viewing}
            onClose={() => setViewing(null)}
            onRegenerate={() => {
              const abs = MOCK_ABSENCES.find((a) => a.id === viewing.absenceRef);
              setViewing(null);
              if (abs) setRequestFor(abs);
            }}
          />
        )}
      </div>
    </LangContext.Provider>
  );
}
