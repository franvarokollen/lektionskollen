import { useT } from '../lib/i18n.js';

export default function AbsenceList({ absences, planByAbsence, onRequest, onView }) {
  const { t } = useT();
  return (
    <div className="card">
      <table className="table">
        <thead>
          <tr>
            <th>{t.time}</th>
            <th>{t.teacher}</th>
            <th>{t.group}</th>
            <th>{t.subject}</th>
            <th>{t.cover}</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {absences.map((a) => {
            const plan = planByAbsence[a.id];
            return (
              <tr key={a.id}>
                <td className="mono">{a.time}</td>
                <td>{a.teacher}</td>
                <td>{a.group}</td>
                <td>{a.subject}</td>
                <td>{a.cover ? <span className="tag ok">{a.cover}</span> : <span className="tag warn">{t.uncovered}</span>}</td>
                <td className="right">
                  {plan ? (
                    <button className="btn secondary" onClick={() => onView(plan)}>{t.viewPlan}</button>
                  ) : (
                    <button className="btn primary" onClick={() => onRequest(a)}>{t.needPlan}</button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
