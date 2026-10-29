/* The substitute's page (plan.html): event wiring and start-up. The rest
   lives in plan-*.ts. */
import { render } from './plan-render';
import { closeStudent, openStudent } from './plan-depth';
import { bodies, load } from './plan-load';
import { runAssist } from './plan-assist';
import { Slide, deckAll, deckScope } from './deck';
import { Labels } from './plan-labels';
import { $, ASPECTS, L, Lang, P, PROG, SESSION, esc, maybe$, saveProg, sb } from './plan-core';
import { Plan } from './types';
/* ── Events ──────────────────────────────────────────── */
// One Escape closes one layer, the top one: help sheet, pupil sheet,
// projector, then teach mode (through its own button, so it lands on the
// section that was showing).
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const sheet = maybe$('sheet');
    if (sheet && !sheet.hidden) { sheet.hidden = true; return; }
    const st = document.getElementById('student');
    if (st && !st.hidden) { closeStudent(); return; }
    const b = document.querySelector('.proj');
    if (b) { b.remove(); P.DECK = null; return; }
    if (P.TEACH && P.DATA) {
      const out = document.querySelector<HTMLElement>('[data-teach="0"]');
      if (out) out.click(); else { P.TEACH = false; render(P.DATA); }
      return;
    }
  }
  // While the deck is up it owns the arrow keys: someone stepping through a
  // worked example in front of a class should not have to find a button.
  if (document.querySelector('.proj') && P.DECK) {
    if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
      e.preventDefault(); P.DI++; paintSlide(); return;
    }
    if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
      e.preventDefault(); P.DI--; paintSlide(); return;
    }
    return;
  }
  if (!P.TEACH || !P.DATA) return;
  if (e.key === 'ArrowRight' || e.key === 'PageDown') {
    const last = Math.max(0, ((bodies(P.DATA)[P.LANG] || {}).phases || []).length - 1);
    if (P.TPHASE < last) { P.TPHASE++; render(P.DATA); window.scrollTo(0, 0); }
  }
  if (e.key === 'ArrowLeft'  || e.key === 'PageUp')   { P.TPHASE = Math.max(0, P.TPHASE - 1); render(P.DATA); window.scrollTo(0, 0); }
});

  

  function slideHtml(sl: Slide, i: number, n: number, l: Labels) {
    const part = sl.ph >= 0 && sl.pn
      ? '<span class="ttl">' + esc(l.projPart.replace('{i}', String(sl.ph + 1)).replace('{n}', String(sl.pn))) + '</span>' : '';
    let body: string;
    if (sl.end) {
      body = '<div class="slide endcard">' +
        '<span class="step">' + esc(l.projEnd) + '</span>' +
        '<h2>' + esc((sl.nextPh ?? -1) >= 0 ? l.projStop : l.projDone) + '</h2>' +
        ((sl.nextPh ?? -1) >= 0
          ? '<button class="nextpart" data-projpart="' + sl.nextPh + '">' + esc(l.projNextPart) + ': ' + esc(sl.nextName) + ' ›</button>'
          : '') +
        '</div>';
    } else if (sl.divider) {
      body = '<div class="slide divider"><span class="step">' +
        esc(l.projPart.replace('{i}', String(sl.ph + 1)).replace('{n}', String(sl.pn))) + '</span><h2>' + esc(sl.h) + '</h2></div>';
    } else {
      body = '<div class="slide">' +
        (sl.step ? '<span class="step">' + esc(sl.step) + '</span>' : '') +
        (sl.h ? '<h2>' + esc(sl.h) + '</h2>' : '') +
        (sl.lead ? '<p class="lead">' + esc(l.projGoal) + ': ' + esc(sl.lead) + '</p>' : '') +
        (sl.pre ? '<pre>' + esc(sl.pre) + '</pre>' : '') +
        (sl.items ? '<ol>' + sl.items.map((q) => '<li>' + esc(q) + '</li>').join('') + '</ol>' : '') +
        '</div>';
    }
    // The stop screen is not a numbered slide: the count is of what to present.
    const shown = (P.DECK || []).filter((x) => !x.end).length;
    return part + body +
      (sl.end ? '' : '<span class="count">' + (i + 1) + ' / ' + shown + '</span>') +
      '<button class="cl" data-projclose>' + esc(l.projHint) + '</button>' +
      '<div class="pnav">' +
        '<button data-projgo="-1"' + (i === 0 ? ' disabled' : '') + '>' + esc(l.projPrev) + '</button>' +
        '<button data-projgo="1"' + (i === n - 1 ? ' disabled' : '') + '>' + esc(l.projNext) + '</button>' +
      '</div>';
  }

  function paintSlide() {
    const box = document.querySelector('.proj');
    if (!box || !P.DECK || !P.DECK.length) return;
    P.DI = Math.max(0, Math.min(P.DI, P.DECK.length - 1));
    box.innerHTML = slideHtml(P.DECK[P.DI]!, P.DI, P.DECK.length, L());
  }

  /** scope: a section number shows that section alone, ending on a stop
   *  screen; 'all' shows the whole lesson with dividers. */
  function openDeck(scope: number | 'all') {
    if (!P.DATA) return;
    const all = bodies(P.DATA); const pp: Plan = all[P.LANG] || {};
    P.DECK = scope === 'all' ? deckAll(pp, L()) : deckScope(pp, L(), scope);
    if (!P.DECK.length) return;
    P.DI = 0;
    const old = document.querySelector('.proj');
    if (old) old.remove();
    const box = document.createElement('div');
    box.className = 'proj';
    document.body.appendChild(box);
    paintSlide();
  }

document.addEventListener('click', async (e) => {
  const l = L();
  const tg = e.target as HTMLElement;

  const sti = tg.closest<HTMLElement>('[data-stier]');
  if (sti) { P.STIER = sti.getAttribute('data-stier')!; openStudent('lesson'); return; }

  const st = tg.closest<HTMLElement>('[data-student],[data-stprint],[data-stcopy],[data-stclose]');
  if (st) {
    if (st.hasAttribute('data-student')) return openStudent(st.getAttribute('data-student')!);
    if (st.hasAttribute('data-stclose')) return closeStudent();
    if (st.hasAttribute('data-stprint')) return window.print();
    try { await navigator.clipboard.writeText(P.STUDENT_TXT); st.textContent = l.copiedTxt; setTimeout(() => { st.textContent = l.copyText; }, 1600); }
    catch { /* clipboard blocked */ }
    return;
  }

  // ── Progress through the lesson ────────────────────────
  const rd = tg.closest<HTMLElement>('[data-ready]');
  if (rd && P.DATA) { const k = rd.getAttribute('data-ready')!; PROG.ready[k] = !PROG.ready[k]; saveProg(); render(P.DATA, true); return; }
  const sd = tg.closest<HTMLElement>('[data-stepdone]');
  if (sd && P.DATA) {
    const i = Number(sd.getAttribute('data-stepdone')!);
    PROG.done[i] = true; saveProg();
    if (P.TEACH) {
      // One step at a time: finishing it means going to the next. After the
      // last, back to the full plan, where the feedback is.
      const cur = bodies(P.DATA)[P.LANG];
      const last = cur ? (cur.phases || []).length - 1 : i;
      if (i < last) { P.TPHASE = i + 1; render(P.DATA); window.scrollTo(0, 0); return; }
      P.TEACH = false; PROG.fbopen = true; saveProg(); render(P.DATA);
      const fb = maybe$('feedback'); if (fb) fb.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    render(P.DATA, true);
    const nx = document.querySelector('.ph-cur') || maybe$('feedback');
    if (nx) nx.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return;
  }
  const sr = tg.closest<HTMLElement>('[data-stepre]');
  if (sr && P.DATA) { delete PROG.done[Number(sr.getAttribute('data-stepre')!)]; saveProg(); render(P.DATA, true); return; }
  if (tg.closest<HTMLElement>('[data-short]') && P.DATA) { PROG.short = !PROG.short; saveProg(); render(P.DATA, true); return; }
  if (tg.closest<HTMLElement>('[data-fbjump]')) {
    PROG.fbopen = true;
    const bd = document.querySelector<HTMLElement>('#feedback .fb-body'); if (bd) bd.hidden = false;
    const tg = document.querySelector('#feedback [data-fbtoggle]'); if (tg) tg.setAttribute('aria-expanded', 'true');
    const f = maybe$('feedback'); if (f) f.scrollIntoView({ behavior: 'smooth', block: 'start' }); return;
  }

  // ── Per-step feedback ──────────────────────────────────
  const sb1 = tg.closest<HTMLElement>('[data-sec]');
  if (sb1) {
    const [ref = '', verdict = ''] = sb1.getAttribute('data-sec')!.split('|');
    const idx = Number(ref.split(':')[1]);
    const label = ((P.DATA && bodies(P.DATA)[P.LANG] || {}).phases || [])[idx]?.n || ref;
    PROG.sec[ref] = Object.assign({}, PROG.sec[ref], { v: verdict }); saveProg();
    const row = sb1.closest<HTMLElement>('[data-fbrow]')!;
    [...row.querySelectorAll('[data-sec]')].forEach((b) => b.classList.toggle('on', b === sb1));
    row.querySelector<HTMLElement>('.fb-note')!.hidden = !(verdict === 'ok' || verdict === 'bad');
    const { error } = await sb.rpc('lk_rate_section_by_token', {
      p_token: P.token, p_session: SESSION, p_ref: ref, p_label: label, p_verdict: verdict, p_note: null,
    });
    $('ratemsg').textContent = error ? l.saveFail + error.message : '';
    return;
  }
  const stb = tg.closest<HTMLElement>('[data-star]');
  if (stb) {
    const n = Number(stb.getAttribute('data-star')!);
    PROG.stars = n; saveProg();
    [...document.querySelectorAll('#fbstars [data-star]')].forEach((b) => b.classList.toggle('on', Number(b.getAttribute('data-star')!) <= n));
    const { error } = await sb.rpc('lk_rate_stars_by_token', { p_token: P.token, p_session: SESSION, p_stars: n });
    $('ratemsg').textContent = error ? l.saveFail + error.message : l.thanks;
    return;
  }
  const ftg = tg.closest<HTMLElement>('[data-fbtoggle]');
  if (ftg) {
    PROG.fbopen = !PROG.fbopen;
    ftg.setAttribute('aria-expanded', PROG.fbopen ? 'true' : 'false');
    const bd = document.querySelector<HTMLElement>('#feedback .fb-body'); if (bd) bd.hidden = !PROG.fbopen;
    return;
  }
  const sn = tg.closest<HTMLElement>('[data-secnote]');
  if (sn) {
    const ref = sn.getAttribute('data-secnote')!;
    const inp = document.querySelector<HTMLInputElement>('[data-secnote-in="' + ref + '"]');
    const val = (inp?.value || '').trim();
    if (!val) return;
    const idx = Number(ref.split(':')[1]);
    const label = ((P.DATA && bodies(P.DATA)[P.LANG] || {}).phases || [])[idx]?.n || ref;
    PROG.sec[ref] = Object.assign({}, PROG.sec[ref], { note: val }); saveProg();
    const { error } = await sb.rpc('lk_rate_section_by_token', {
      p_token: P.token, p_session: SESSION, p_ref: ref, p_label: label, p_verdict: PROG.sec[ref].v || 'ok', p_note: val,
    });
    sn.textContent = error ? '!' : l.fbSavedS;
    return;
  }

  const qk = tg.closest<HTMLElement>('[data-quick]');
  if (qk && P.DATA) { P.QUICK = qk.getAttribute('data-quick') === '1'; render(P.DATA); window.scrollTo(0, 0); return; }

  const tm = tg.closest<HTMLElement>('[data-teach]');
  if (tm && P.DATA) {
    P.TEACH = tm.getAttribute('data-teach') === '1';
    if (P.TEACH) P.TPHASE = 0;
    render(P.DATA); window.scrollTo(0, 0); return;
  }

  const tp = tg.closest<HTMLElement>('[data-tph]');
  if (tp && P.DATA) {
    P.TPHASE = parseInt(tp.getAttribute('data-tph')!, 10) || 0;
    render(P.DATA); window.scrollTo(0, 0); return;
  }

  // A phase's own button opens the deck at that phase rather than a
  // standalone card, so moving on does not mean closing and hunting.
  const pj = tg.closest<HTMLElement>('[data-proj]');
  if (pj && P.DATA) {
    openDeck(parseInt(pj.getAttribute('data-proj')!, 10) || 0);
    return;
  }
  const pnx = tg.closest<HTMLElement>('[data-projpart]');
  if (pnx && P.DATA) { openDeck(parseInt(pnx.getAttribute('data-projpart')!, 10) || 0); return; }
  if (tg.closest<HTMLElement>('[data-projdeck]') && P.DATA) { openDeck('all'); return; }
  const pg = tg.closest<HTMLElement>('[data-projgo]');
  if (pg) { P.DI += parseInt(pg.getAttribute('data-projgo')!, 10); paintSlide(); return; }
  if (tg.closest<HTMLElement>('[data-projclose]')) {
    const b = document.querySelector('.proj'); if (b) b.remove();
    // Land on the section the class was last shown, not where the page was
    // before the projector opened.
    const cs = P.DECK && P.DECK[P.DI];
    P.DECK = null;
    if (cs && typeof cs.ph === 'number' && cs.ph >= 0 && P.DATA) {
      if (P.TEACH) { P.TPHASE = cs.ph; render(P.DATA); window.scrollTo(0, 0); }
      else { const t = document.getElementById('ph' + cs.ph); if (t) t.scrollIntoView({ block: 'start' }); }
    }
    return;
  }

  const dp = tg.closest<HTMLElement>('[data-depth]');
  if (dp && P.DATA) {
    P.DEPTH = dp.getAttribute('data-depth')!;
    try { localStorage.setItem('lk.depth', P.DEPTH); } catch { /* private window */ }
    render(P.DATA, true);
    return;
  }
  if (tg.closest<HTMLElement>('[data-pack]')) { window.print(); return; }

  const tv = tg.closest<HTMLElement>('[data-tv]');
  const tn = tg.closest<HTMLElement>('[data-tnote]');
  if (tv || tn) {
    const verdict = tv ? tv.getAttribute('data-tv')! : null;
    if (tv) [...$('tverdict').children].forEach((x) => x.classList.toggle('on', x === tv));
    const { error } = await sb.rpc('lk_teacher_verdict', {
      p_token: P.token, p_verdict: verdict, p_note: tn ? $<HTMLInputElement>('tnote').value.trim() : null,
    });
    $('tmsg').textContent = error ? L().saveFail + error.message : L().tThanks;
    return;
  }

  const lcov = tg.closest<HTMLElement>('[data-lcov]');
  const lleft = tg.closest<HTMLElement>('[data-lleft]');
  if (lcov || lleft) {
    if (lcov) {
      P.COV = lcov.getAttribute('data-lcov')!;
      [...$('covrow').children].forEach((b) => b.classList.toggle('on', b === lcov));
    }
    if (lleft) P.LEFT = $<HTMLInputElement>('leftoff').value.trim();
    const { error } = await sb.rpc('lk_linked_coverage', { p_token: P.token, p_coverage: P.COV || null, p_left_off: P.LEFT || null });
    $('lratemsg').textContent = error ? L().saveFail + error.message : L().thanks;
    return;
  }
  const asp = tg.closest<HTMLElement>('[data-asp]');
  if (asp) {
    const parts = asp.getAttribute('data-asp')!.split(':');
    ASPECTS[parts[0]!] = parts[1]!;
    [...$('q-' + parts[0]).children].forEach((x) => x.classList.toggle('on', x === asp));
    // "No" and "with changes" are the answers worth a reason, so ask then.
    if (parts[0] === 'reuse') {
      $('why').hidden = parts[1] === 'yes';
      $('saybox').hidden = false;
    }
    const { error } = await sb.rpc('lk_rate_aspects_by_token', {
      p_token: P.token, p_session: SESSION, p_reuse: ASPECTS.reuse || null,
      p_clarity: ASPECTS.clarity || null, p_timefit: ASPECTS.timefit || null,
    });
    const done = !!ASPECTS.reuse;
    $('ratemsg').textContent = error ? L().saveFail + error.message : (done ? L().thanks : L().savedSoFar);
    return;
  }
  const cov = tg.closest<HTMLElement>('[data-cov]');
  const lo = tg.closest<HTMLElement>('[data-leftoff]');
  if (cov || lo) {
    if (cov) {
      P.COV = cov.getAttribute('data-cov')!;
      document.querySelectorAll('#covrow button').forEach((b) => b.classList.toggle('on', b === cov));
    }
    P.LEFT = maybe$<HTMLInputElement>('leftoff')?.value || '';
    if (!P.COV) { $('ratemsg').textContent = l.pickCovFirst; return; }
    const { error } = await sb.rpc('lk_rate_coverage_by_token', { p_token: P.token, p_coverage: P.COV, p_left_off: P.LEFT });
    $('ratemsg').textContent = error ? l.saveFail + error.message : l.thanks;
    return;
  }
  const pick = tg.closest<HTMLElement>('[data-pick]');
  if (pick && P.DATA) {
    P.LANG = pick.getAttribute('data-pick') as Lang;
    try { localStorage.setItem('lk.lang', P.LANG); } catch { /* private window */ }
    render(P.DATA);
    window.scrollTo(0, 0);
    return;
  }

  const a = tg.closest<HTMLElement>('[data-assist]');
  if (a) {
    return runAssist({
      kind: a.getAttribute('data-assist')!,
      ref: a.getAttribute('data-ref')!,
      label: a.getAttribute('data-label')!,
      variant: a.getAttribute('data-variant') || '',
      text: a.closest<HTMLElement>('.phase, .ps')?.innerText?.slice(0, 1200) || '',
    });
  }

  if (tg.closest<HTMLElement>('[data-assistnew]') && P.LASTASSIST) {
    return runAssist(Object.assign({}, P.LASTASSIST, { fresh: true }));
  }

  const fill = tg.closest<HTMLElement>('[data-fill]');
  if (fill) {
    return runAssist({
      kind: 'filler', ref: 'lesson', label: l.barLbl,
      minutes: Number(fill.getAttribute('data-fill')!),
    });
  }

  if (tg.closest<HTMLElement>('[data-sheetclose]') || tg.id === 'sheet') {
    $('sheet').hidden = true;
    return;
  }

  const xv = tg.closest<HTMLButtonElement>('[data-xv]');
  if (xv) {
    const [id, up] = xv.getAttribute('data-xv')!.split(':');
    document.querySelectorAll<HTMLButtonElement>('[data-xv]').forEach((b) => { b.disabled = true; b.classList.toggle('on', b === xv); });
    const { error } = await sb.rpc('lk_extra_verdict_by_token', { p_token: P.token, p_extra_id: Number(id), p_up: up === '1' });
    const m = maybe$('xvmsg'); if (m) m.textContent = error ? '' : l.xvThanks;
    return;
  }

  const noteBtn = tg.closest<HTMLButtonElement>('[data-note]');
  if (noteBtn) {
    const val = maybe$<HTMLInputElement>('noteq')?.value || '';
    if (!val.trim()) return;
    noteBtn.disabled = true;
    const { data, error } = await sb.rpc('lk_extra_note', {
      p_token: P.token, p_extra_id: Number(noteBtn.getAttribute('data-note')!), p_note: val,
    });
    $('notemsg').textContent = (error || !data) ? l.saveFail + (error?.message || '') : l.noteSaved;
    return;
  }

  const sayBtn = tg.closest<HTMLButtonElement>('[data-comment]');
  if (sayBtn) {
    const val = maybe$<HTMLInputElement>('say')?.value || '';
    if (!val.trim()) return;
    P.SAY = val;
    sayBtn.disabled = true;
    const { error } = await sb.rpc('lk_rate_comment_by_token', { p_token: P.token, p_comment: val });
    $('ratemsg').textContent = error ? l.saveFail + error.message : l.thanks;
    return;
  }

  const reason = tg.closest<HTMLElement>('[data-reason]');
  if (reason) {
    const k = reason.getAttribute('data-reason')!;
    if (P.REASONS.has(k)) { P.REASONS.delete(k); reason.classList.remove('on'); }
    else { P.REASONS.add(k); reason.classList.add('on'); }
    const { error } = await sb.rpc('lk_rate_reasons_by_token', {
      p_token: P.token, p_reasons: [...P.REASONS],
    });
    $('ratemsg').textContent = error ? l.saveFail + error.message : l.thanks;
    return;
  }

});

load();
export {};
