// © 2026 Frånvarokollen Sverige AB. All rights reserved. Proprietary and confidential: see LICENSE.
/** The name is saved with the approval. Remembered on this device so the
 *  second plan of the morning does not ask again. */
import { subjectLabel } from './lk-catalog';
import { StrMap, esc, fillT, state, t } from './lk-core';
import { APPR_MAX, apprLevelName, apprStars } from './lk-pool';
export const APPROVER_KEY = 'lk_approver';
export function apprNameValue() {
  if (state.apprName != null) return state.apprName;
  try { return localStorage.getItem(APPROVER_KEY) || ''; } catch { return ''; }
}

const APPR_RUNGS: [number, string, string, string][] = [[1, 'coordinator', 'apprCoord', 'btn-ghost'],
                    [2, 'teacher', 'apprTeacher', 'btn-ok'],
                    [3, 'qualified', 'apprQualified', 'btn-primary']];
export const APPR_ERR: StrMap = { gate_closed: 'errGate', already_approved: 'errAlready', name_required: 'errName', has_blockers: 'errBlockers' };

export function apprButtons(rank: number) {
  return APPR_RUNGS.filter((r) => r[0] > rank).map((r) =>
    '<button class="btn ' + r[3] + ' btn-sm" data-approve="' + r[1] + '">' +
    apprStars(r[0], '', true) + ' ' + esc(t(r[2])) + '</button>').join('');
}

/** The ladder, where the coordinator arrives. Only rungs above the one the plan
 *  already holds are offered, and at the top the bar is gone: the gate is
 *  closed until the plan changes. */
export function approveBar() {
  const rank = state.apprRank || 0;
  if (rank >= APPR_MAX) return '';
  const fresh = !state.approved;
  return '<div class="approvebar' + (fresh ? '' : ' raise') + '"><div>' +
    (fresh
      ? '<b>' + esc(t('coordAsk')) + '</b> ' + esc(t('apBody')) +
        '<br><span class="hint">' + esc(t('coordAskNote')) + '</span>'
      : '<b>' + esc(rank ? fillT('apRaise', { l: apprLevelName(rank) }) : t('apReapprove')) + '</b> ' + esc(t('apRaiseBody'))) +
    '<br><span class="hint">' + esc(t('apprKindNote')) + '</span>' +
    '<label class="aprname"><span>' + esc(t('apprNameLabel')) + '</span>' +
      '<input id="apr-name" type="text" maxlength="80" autocomplete="name" placeholder="' +
      esc(t('apprNamePh')) + '" value="' + esc(apprNameValue()) + '"></label>' +
    '</div><div class="ladder">' + apprButtons(rank) + '</div></div>';
}

/** "★★☆ Teacher · Engelska — approved by Tom", for the line under a plan. */
export function apprSignedLine() {
  const rank = state.apprRank || 0;
  if (!rank) return '';
  return apprStars(rank) + ' ' + esc(apprLevelName(rank) +
    (rank >= 2 && state.apprSubject ? ' · ' + subjectLabel(state.apprSubject) : '')) +
    (state.apprBy ? ' — ' + esc(fillT('apprSignedBy', { n: state.apprBy })) : '') +
    (rank >= APPR_MAX ? ' ' + esc(t('apprLocked')) : '');
}

/** Open a plan. `row` is the lesson it is being opened FOR — an absence —
 *  or null when it is opened on its own (bank, feedback, a new plan), in which
 *  case the plan stands alone and no class, time or substitute is implied. */
