# Hosting Lektionskollen from a private repository

Since 2026-10-31 the repository is **private**. GitHub Pages does not serve a
private repository on the free plan, so `…github.io/lektionskollen/` returns 404.
Two ways back; the app needs no build step either way, because `app/` holds the
built files.

## Option A — Cloudflare Pages (recommended, free)

The marketing site already deploys there.

1. Cloudflare dashboard → **Workers & Pages** → **Create** → **Pages** →
   **Connect to Git** → pick `franvarokollen/lektionskollen` (grant the
   Cloudflare GitHub app access to this private repo when asked).
2. Build settings: **Framework preset** None · **Build command** empty ·
   **Build output directory** `/`.
3. Deploy. The app is at `https://<project>.pages.dev/app/`.
4. Optional: **Custom domains** → `lektionskollen.franvarokollen.com`.
5. Update the URL in: `README.md`, `fvk-integration/README.md`
   (`NEXT_PUBLIC_LEKTIONSKOLLEN_APP_URL`), the handover §2, and tell Gareth.

Every push to `main` deploys; pull requests get preview URLs.
Substitute links are built from the page's own address, so they follow the
new host. The edge functions accept any origin, so nothing changes there.

## Option B — GitHub Team plan

Upgrade the `franvarokollen` organisation (paid, per user). Pages then serves
the private repo again at the same URL. Note the *site* stays public either
way; only the source is private.

## What stays protected

| | Visible to the public? |
|---|---|
| Source (`app-src/`, `supabase/`, docs, history) | No — private repo |
| Prompts, validation, ranking (edge + database functions) | No — run on the server |
| Shipped `app/*.js`, `lk.css` | Yes, minified, with a copyright banner |
| Plans | Only through the app's functions, per school |
