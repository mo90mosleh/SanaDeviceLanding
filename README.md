# SANA Device Landing

Persian RTL, mobile-first showcase for SANA's CBC and POCT diagnostic equipment, built on the existing React / TanStack Start / Vite application.

Repository: https://github.com/mo90mosleh/SanaDeviceLanding

Website: https://cbc.ortanes.com/

## Local development

```sh
pnpm install --frozen-lockfile
pnpm dev --host 127.0.0.1 --port 5173
```

## Verification

```sh
pnpm build
pnpm typecheck
pnpm test
# With the local server running:
pnpm test:routes
```

The build regenerates `src/routeTree.gen.ts`. Type checking should run after the initial build. The committed pnpm lockfile records the validated dependency resolution.

Product routes remain `/cbc/bha3000`, `/cbc/bha5000`, `/cbc/bha5100`, `/poct/fs-114` and `/poct/fs-205`. The homepage is `/`. GitHub Pages publishes all six routes beneath the repository base path, with complete static HTML, authentic public assets and a Persian 404 page.

## Content and assets

Structured product content: `src/components/landing/products.ts`.
Shared page components: `src/components/landing/Site.tsx`.
Authentic product photographs, brand marks and model-specific PDFs: `public/product-assets/`.
Self-hosted Vazirmatn and its OFL license: `public/fonts/`.

See [catalog sources and audit](docs/CONTENT-SOURCES.md), [form integration](docs/FRONTEND-INTEGRATION.md) and [verification](docs/SHEETS-DIALOG-VERIFICATION.md).

## Consultation

Forms collect name, laboratory name and Iranian mobile number. The homepage also provides a product selector; product pages retain their current device. Requests go directly to the owner's n8n webhook using the verified Google Sheets field mapping. Acknowledged submissions clear the form and display an accessible success popup; failures preserve the input. Only UTM attribution is persisted in session storage.

## Publication

GitHub Actions builds, exports and reviews the existing application before publishing to GitHub Pages. The public URL and base path follow actual GitHub Pages settings: the custom domain `cbc.ortanes.com` publishes at `/`, while repository-based previews retain their own paths. Export, browser review and webhook CORS checks share `scripts/github-pages-config.mjs`. A read-only live crawl verifies the real domain after deployment. The webhook endpoint and form data are unchanged by publication configuration.
