// © 2026 Frånvarokollen Sverige AB. All rights reserved. Proprietary and confidential: see LICENSE.
// Publishes the renderer as window.LKPlan for the scripts that are not modules yet.
import { render, help, after, kind } from './plan-view';

declare global {
  interface Window { LKPlan: { render: typeof render; help: typeof help; after: typeof after; kind: typeof kind } }
}
window.LKPlan = { render, help, after, kind };
