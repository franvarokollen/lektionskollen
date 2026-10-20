import { useT } from '../lib/i18n.js';
import { asLine, asList } from '../../supabase/functions/_shared/json.ts';

function Section({ title, children }) {
  if (!children) return null;
  return (
    <section className="plan-section">
      <h3>{title}</h3>
      {children}
    </section>
  );
}

function QA({ items, answerLabel }) {
  const list = asList(items);
  if (!list.length) return null;
  return (
    <ol className="qa">
      {list.map((x, i) => (
        <li key={i}>
          <div>{asLine(x?.question ?? x?.q ?? x)}</div>
          {(x?.answer ?? x?.a) && <div className="answer"><strong>{answerLabel}:</strong> {asLine(x.answer ?? x.a)}</div>}
        </li>
      ))}
    </ol>
  );
}

export default function PlanView({ record, onClose, onRegenerate }) {
  const { t } = useT();
  const p = record.plan || {};
  const r = record.request || {};
  const phases = asList(p.phases);
  const materials = asList(p.materials);
  const totalMin = phases.reduce((s, ph) => s + (Number(ph?.minutes) || 0), 0);

  return (
    <div className="overlay plan-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <article className="plan">
        <div className="plan-actions no-print">
          <button className="btn primary" onClick={() => window.print()}>{t.print}</button>
          <button className="btn secondary" disabled title={t.comingPhase2}>{t.sendToSub}</button>
          {record.absenceRef && <button className="btn ghost" onClick={onRegenerate}>{t.regenerate}</button>}
          <span className="spacer" />
          <button className="btn ghost" onClick={onClose}>{t.close}</button>
        </div>

        {record.repaired && <div className="alert warn no-print">{t.repairedWarn}</div>}

        <header className="plan-head">
          <h2>{asLine(p.title) || `${r.subject} – ${r.yearGroup}`}</h2>
          <p className="muted">
            {asLine(p.subject) || r.subject} · {asLine(p.yearGroup) || r.yearGroup}
            {r.group ? ` (${r.group})` : ''} · {asLine(p.durationMinutes) || r.durationMinutes} min
            {totalMin && Number(r.durationMinutes) && totalMin !== Number(r.durationMinutes) ? ` · ⚠ ${totalMin} min i faserna` : ''}
          </p>
          <p className="meta no-print">{record.model} · {Math.round((record.ms || 0) / 1000)}s</p>
        </header>

        <Section title={t.summary}>{p.summaryForSubstitute && <p>{asLine(p.summaryForSubstitute)}</p>}</Section>

        <div className="grid2">
          <Section title={t.learningGoal}>{p.learningGoal && <p>{asLine(p.learningGoal)}</p>}</Section>
          <Section title={t.successCriteria}>
            {asList(p.successCriteria).length > 0 && (
              <ul>{asList(p.successCriteria).map((s, i) => <li key={i}>{asLine(s)}</li>)}</ul>
            )}
          </Section>
        </div>

        <Section title={t.board}>{p.boardLayout && <pre className="board">{asLine(p.boardLayout)}</pre>}</Section>

        <Section title={t.phases}>
          {phases.length > 0 && phases.map((ph, i) => (
            <div className="phase" key={i}>
              <div className="phase-head">
                <span className="phase-num">{i + 1}</span>
                <strong>{asLine(ph?.name)}</strong>
                <span className="mins">{asLine(ph?.minutes)} min</span>
              </div>
              {ph?.teacherScript && <p className="script"><strong>{t.say}:</strong> {asLine(ph.teacherScript)}</p>}
              {ph?.pupilActivity && <p><strong>{t.pupils}:</strong> {asLine(ph.pupilActivity)}</p>}
              {ph?.expectedResponses && <p className="expect"><strong>{t.expect}:</strong> {asLine(ph.expectedResponses)}</p>}
              {asList(ph?.checkQuestions).length > 0 && (
                <div className="checks">
                  <strong>{t.check}</strong>
                  <QA items={ph.checkQuestions} answerLabel={t.answer} />
                </div>
              )}
            </div>
          ))}
        </Section>

        <Section title={t.materials}>
          {materials.length > 0 && materials.map((m, i) => (
            <div className="material" key={i}>
              <h4>{asLine(m?.item ?? m?.name ?? `Material ${i + 1}`)}</h4>
              <div className="material-body">{asLine(m?.content ?? m)}</div>
            </div>
          ))}
        </Section>

        <Section title={t.tasks}>{asList(p.tasks).length > 0 && <QA items={p.tasks} answerLabel={t.answer} />}</Section>

        <div className="grid2">
          <Section title={t.support}>{p.differentiation?.support && <p>{asLine(p.differentiation.support)}</p>}</Section>
          <Section title={t.extension}>{p.differentiation?.extension && <p>{asLine(p.differentiation.extension)}</p>}</Section>
        </div>

        <div className="grid2">
          <Section title={t.earlyFinishers}>{p.earlyFinishers && <p>{asLine(p.earlyFinishers)}</p>}</Section>
          <Section title={t.exitTicket}>
            {p.exitTicket && (
              <p>
                {asLine(p.exitTicket?.question ?? p.exitTicket)}
                {p.exitTicket?.answer && <><br /><span className="answer"><strong>{t.answer}:</strong> {asLine(p.exitTicket.answer)}</span></>}
              </p>
            )}
          </Section>
        </div>

        <Section title={t.management}>
          {asList(p.classroomManagement).length > 0 && (
            <ul>{asList(p.classroomManagement).map((s, i) => <li key={i}>{asLine(s)}</li>)}</ul>
          )}
        </Section>

        <Section title={t.situations}>
          {asList(p.difficultSituations).length > 0 && (
            <dl className="situations">
              {asList(p.difficultSituations).map((s, i) => (
                <div key={i}>
                  <dt>{asLine(s?.situation ?? s)}</dt>
                  {s?.response && <dd>{asLine(s.response)}</dd>}
                </div>
              ))}
            </dl>
          )}
        </Section>

        <Section title={t.handover}>{p.handoverNote && <p className="handover">{asLine(p.handoverNote)}</p>}</Section>
        <Section title={t.curriculum}>{p.curriculumLink && <p className="muted">{asLine(p.curriculumLink)}</p>}</Section>
      </article>
    </div>
  );
}
