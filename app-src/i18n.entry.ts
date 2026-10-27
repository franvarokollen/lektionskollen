import { LK_T } from './i18n';
declare global { interface Window { LK_T: typeof LK_T } }
window.LK_T = LK_T;
