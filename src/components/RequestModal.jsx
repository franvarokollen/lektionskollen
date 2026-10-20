import { useEffect, useRef, useState } from 'react';
import { useT } from '../lib/i18n.js';
import { requestLessonPlan } from '../lib/ai.js';
import { savePlan } from '../lib/store.js';

const RESOURCE_KEYS = ['whiteboard', 'projector', 'chromebooks', 'textbooks', 'miniwhiteboards'];

export default function RequestModal({ absence, onClose, onDone }) {
  const { t } = useT();
  const [form, setForm] = useState({
    subject: absence.subject,
    yearGroup: absence.yearGroup,
    durationMinutes: absence.durationMinutes,
    topic: '',
    teacherNotes: '',
    groupSize: '',
    resources: ['whiteboard'],
    language: 'sv',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const timer = useRef(null);

  useEffect(() => () => clearInterval(timer.current), []);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const toggleRes = (k) =>
    setForm((f) => ({ ...f, resources: f.resources.includes(k) ? f.resources.filter((r) => r !== k) : [...f.resources, k] }));

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setElapsed(0);
    timer.current = setInterval(() => setElapsed((s) => s + 1), 1000);

    // Resource labels go to the model in English-neutral form
    const request = {
      ...form,
      durationMinutes: Number(form.durationMinutes),
      groupSize: form.groupSize ? Number(form.groupSize) : undefined,
      resources: form.resources.map((k) => STRINGS_EN_RES[k]),
    };

    try {
      const result = await requestLessonPlan(request, absence.id);
      const record = savePlan({ absenceRef: absence.id, request: { ...request, group: absence.group, teacher: absence.teacher }, result });
      onDone(record);
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      clearInterval(timer.current);
      setBusy(false);
    }
  }

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && !busy && onClose()}>
      <form className="modal" onSubmit={submit}>
        <div className="modal-head">
          <div>
            <h2>{t.requestTitle}</h2>
            <p className="muted">{absence.teacher} · {absence.group} · {absence.time}</p>
          </div>
          <button type="button" className="btn ghost" onClick={onClose} disabled={busy}>✕</button>
        </div>

        <div className="grid2">
          <label>{t.subject}<input value={form.subject} onChange={set('subject')} required /></label>
          <label>{t.yearGroup}<input value={form.yearGroup} onChange={set('yearGroup')} required /></label>
          <label>{t.duration}<input type="number" min="10" max="240" value={form.durationMinutes} onChange={set('durationMinutes')} required /></label>
          <label>{t.groupSize}<input type="number" min="1" max="40" value={form.groupSize} onChange={set('groupSize')} /></label>
        </div>

        <label>{t.topic}<input value={form.topic} onChange={set('topic')} placeholder={t.topicHint} /></label>
        <label>{t.notes}<textarea rows="3" value={form.teacherNotes} onChange={set('teacherNotes')} placeholder={t.notesHint} /></label>

        <fieldset>
          <legend>{t.resources}</legend>
          <div className="chips">
            {RESOURCE_KEYS.map((k) => (
              <button type="button" key={k} className={`chip ${form.resources.includes(k) ? 'on' : ''}`} onClick={() => toggleRes(k)}>
                {t.res[k]}
              </button>
            ))}
          </div>
        </fieldset>

        <label className="inline">
          {t.outputLang}
          <select value={form.language} onChange={set('language')}>
            <option value="sv">Svenska</option>
            <option value="en">English</option>
          </select>
        </label>

        {error && (
          <div className="alert error">
            <strong>{t.error}:</strong> {error}
          </div>
        )}

        <div className="modal-foot">
          {busy && <span className="muted">{t.generatingHint} {elapsed}s</span>}
          <button type="button" className="btn ghost" onClick={onClose} disabled={busy}>{t.cancel}</button>
          <button type="submit" className="btn primary" disabled={busy}>
            {busy ? t.generating : error ? t.retry : t.generate}
          </button>
        </div>
      </form>
    </div>
  );
}

const STRINGS_EN_RES = {
  whiteboard: 'whiteboard',
  projector: 'projector',
  chromebooks: 'computers/Chromebooks for every pupil',
  textbooks: 'class textbooks',
  miniwhiteboards: 'mini whiteboards for every pupil',
};
