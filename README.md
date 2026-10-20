# SANA diagnostic equipment frontend

Persian RTL, mobile-first product selector and five shared product pages built on the repository's existing React / TanStack Start / Vite stack.

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

The build regenerates `src/routeTree.gen.ts`. Type checking should run after the initial route generation/build. The committed pnpm lockfile records the validated dependency resolution. No hosting or domain migration is included.

Routes: `/`, `/cbc/bha3000`, `/cbc/bha5000`, `/cbc/bha5100`, `/poct/fs-114`, `/poct/fs-205`. Each route renders server-side, including metadata; unknown paths show a Persian fallback.

## Content and assets

Structured product content: `src/components/landing/products.ts`.
Shared page components: `src/components/landing/Site.tsx`.
Optimized photographs, original brand marks and model-specific PDFs: `public/product-assets/`.
Self-hosted Vazirmatn and OFL license: `public/fonts/`.

See [catalog sources and audit](docs/CONTENT-SOURCES.md), [form integration boundary](docs/FRONTEND-INTEGRATION.md) and [verification](docs/VERIFICATION.md).

## Consultation

The default handler performs no network request and never reports a submitted request. The form validates Iranian mobile numbers, prepares a typed product-specific payload and shows an accurate not-connected notice. Only UTM campaign data is stored in sessionStorage. Personal form fields are not logged or persisted.

Do not merge or deploy without explicit owner approval.
