# Verification

Verified locally on 20 October 2026.

- Production build: Vite client, SSR and existing Cloudflare-module output succeed. Upstream toolchain emits non-fatal `use client` bundling and plugin notices.
- TypeScript: `tsc --noEmit` passes after route generation.
- Six focused tests pass: Persian/Arabic/international mobile normalization, invalid-field handling, no-network default submission, UTM persistence and campaign replacement, corrupt/blocked storage, five-product asset/catalog integrity and campaign exclusions.
- Eight local HTTP smoke tests pass: homepage, five direct product URLs, unknown-route 404, favicon/manifest/font assets. Each product's images and PDF download links return 200; PDF signatures are checked.
- Browser review: desktop homepage and CBC cards, FS-114 page and consultation. Empty submit produces five field errors; valid synthetic test data produces the explicit not-connected notice. No success is reported and no lead endpoint is called.
- Responsive iframe review: 320px and 375px product layouts and 768px homepage. The rendered document widths match their scroll widths (305/305, 360/360, 753/753 after browser scrollbars), with no broken images. Desktop review at approximately 1265px also shows the intended three-card CBC row and two-card POCT row.
- Source scan: no expired giveaway copy, excluded model, or former parent-brand copy in active page components and metadata; the existing technical hostname remains in canonical/OG URLs.

The temporary responsive QA page is removed before final build and commit. No hosting deployment, merge, production form submission or external automation modification is included.

Review note: the old BHA5000 photo visibly carries a veterinary label and was replaced with an authentic current manufacturer image. Supplied and current manufacturer specifications differ for display/memory; page data follows the supplied catalog and requests configuration confirmation. See CONTENT-SOURCES.md before publication.
