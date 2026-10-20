import { useT } from '../lib/i18n.js';
import { asLine } from '../../supabase/functions/_shared/json.ts';

export default function PlanLibrary({ plans, onView, onDelete }) {
  const { t, lang } = useT();
  if (!plans.length) return <div className="card empty">{t.noPlansYet}</div>;

  return (
    <div className="card">
      <table className="table">
        <thead>
          <tr>
            <th>{t.subject}</th>
            <th>{t.group}</th>
            <th>{lang === 'sv' ? 'Titel' : 'Title'}</th>
            <th>{t.teacher}</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {plans.map((p) => (
            <tr key={p.id}>
              <td>{p.request?.subject}</td>
              <td>{p.request?.group || p.request?.yearGroup}</td>
              <td>
                {asLine(p.plan?.title) || '—'}
                <div className="meta">{new Date(p.createdAt).toLocaleString(lang === 'sv' ? 'sv-SE' : 'en-GB')}</div>
              </td>
              <td>{p.request?.teacher || '—'}</td>
              <td className="right">
                <button className="btn secondary" onClick={() => onView(p)}>{t.viewPlan}</button>
                <button className="btn ghost danger" onClick={() => confirm(`${t.delete}?`) && onDelete(p.id)}>{t.delete}</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
