# GitHub Pages publication

Production website: https://cbc.ortanes.com/

GitHub Pages settings are the publication source of truth. The build reads `base_url` and `base_path` from `actions/configure-pages`, then shares normalized `SANA_SITE_URL` and `SANA_BASE_PATH` across Vite, the static exporter, browser review and CORS preflight. A custom domain uses `/`; project sites without a custom domain retain their repository path.

## Custom-domain repair — 2026-10-24

A read-only live crawl confirmed the homepage and all five root product routes returned HTTP 200, while their CSS, JavaScript, product images, logos, favicon and navigation still referenced `/SanaDeviceLanding/`. Those URLs returned HTTP 404; the same asset paths without the project prefix returned HTTP 200. GitHub Pages reported `cname: cbc.ortanes.com` with HTTPS enforced.

The build now follows the actual Pages configuration rather than inferring production's base from the repository name. No CSS layout, product content, form payload, webhook endpoint or submission handler is changed. The real n8n OPTIONS preflight checks the current published origin.

## Verification

Publication runs configuration regression tests, build, typecheck, six-route static export and twelve static browser reviews with intercepted form requests. After deployment, a read-only crawl checks six live pages, their CSS/JavaScript, images, fonts, icons, manifest and catalogs. Browser checks cover homepage, CBC and POCT at mobile and desktop widths, including the existing consultation dialog without submitting it. Reports and screenshots are uploaded to the Actions artifact.

The separately gated synthetic-lead workflow resolves the same publication URL. It still runs only on manual dispatch or an explicit verification commit. It is not run as part of a domain repair.
