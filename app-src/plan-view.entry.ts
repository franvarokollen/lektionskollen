// Publishes the renderer as window.LKPlan for the scripts that are not modules yet.
import { render, help, after, esc, kind } from './plan-view';

declare global {
  interface Window { LKPlan: { render: typeof render; help: typeof help; after: typeof after; esc: typeof esc; kind: typeof kind } }
}
window.LKPlan = { render, help, after, esc, kind };
