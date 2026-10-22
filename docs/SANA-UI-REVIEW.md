# SANA interface refinement

Preview: https://sana-pr-preview.onrender.com/

## Audit and implementation

The existing application uses React, TanStack Start, Vite and a shared custom stylesheet, with Tailwind available. The product routes share one presentation component and the product catalog supplies their factual content. Vazirmatn remains the Persian typeface. The deployed version at `f56c922c5792988143e50ccefcc036d894eccf5a` is the comparison baseline.

The mobile homepage repeated five tall product cards beneath a large hero. Repeated descriptions, image panels and section gaps made discovery require substantial scrolling. The burgundy palette dominated the interface despite the three-color SANA asset. Transparent space inside that logo weakened its apparent size. Product details had opportunities for more consistent section headings, lighter surfaces, smaller feature panels and clearer FAQ affordances.

The revised homepage presents a concise introduction, an authentic five-device hero slideshow with two-second rotation and a keyboard-accessible CBC/POCT selector. The active family uses compact horizontal cards on mobile and a grid on larger screens. Both families and all five routes remain in server-rendered HTML. Direct family links select the correct panel. Arrow keys, Home/End and Tab support keyboard exploration; switching preserves query parameters and attribution.

Detail pages retain every specification, advantage, application, workflow step, catalog link and FAQ from the existing content. Their shared presentation now has clear category/model hierarchy, consistent section headings, restrained informational blue accents and a neutral two-column technical table with explicit right alignment. Independent highlights retain descriptive symbols. The four outlined section links fit without horizontal scrolling; catalog and FAQ content remain below. The existing mobile consultation bar is retained with compact spacing. No new sticky overlays were introduced.

## Brand tokens

The authentic SANA PNG remains unchanged. Its transparent margins are removed only by its SVG display viewport. Device photographs and their proportions remain authentic, including the existing BHA5000 display crop of surplus white space.

| Token | Value | Use |
| --- | --- | --- |
| Logo green | `#028a3f` | Color sampled from the logo |
| Primary interaction | `#02753b` | Darker green for legible white CTA text |
| Primary hover | `#045c32` | Button feedback |
| Blue | `#0047bf` | Information, POCT identifiers and keyboard focus |
| Red | `#bf0115` | Limited brand accent |
| Main text | `#142c35` | Headings and primary text |
| Secondary text | `#61747c` | Supporting copy |
| Border | `#dfe7eb` | Subtle separation |
| Neutral surface | `#f5f8fa` | Product images and section backgrounds |

Spacing, corner radii, shadows and colors share CSS variables. Interactive targets, visible focus states and reduced-motion preferences are preserved. Persian/Latin models and values use directional isolation.

## Content and integration scope

Product data, specifications, authentic assets, existing routes and attribution remain preserved. Homepage forms offer a required five-device dropdown; product-page forms retain the current device. Three homepage CTA locations lead to the shared consultation section. Contact fields and Iranian mobile validation remain the same.

Consultation requests now use the same-origin server endpoint and the owner's configured webhook. Acknowledgement, failure and pending states reflect actual delivery results. Server configuration and payload details are documented in [FRONTEND-INTEGRATION.md](FRONTEND-INTEGRATION.md). The integration tests use local/mock receivers; the separate live smoke check sends a single explicitly labelled test record only when requested.

Every product page has a “تغییر محصول” link back to the homepage hero. The five-device hero slider uses two-second rotation with pause and manual controls and respects reduced-motion preferences. Exhibition wording is absent from the interface.

## Modified files

- `src/components/landing/BrandLogo.tsx`: shared authentic logo viewport.
- `src/components/landing/SiteChrome.tsx`: header and footer.
- `src/components/landing/HomePage.tsx`: hero, family selector and reusable compact product cards.
- `src/components/landing/ProductDetail.tsx`: shared product presentation and return-to-home action.
- `src/components/landing/ProductSlideshow.tsx`: five-device hero slideshow with two-second rotation.
- `src/components/landing/Consultation.tsx`: shared homepage/product consultation, dropdown and acknowledged delivery states.
- `src/lib/consultation.ts`: same-origin delivery client.
- `src/server/consultation.ts`, `src/routes/api.consultation.ts`: validated server-side forwarding.
- `tests/consultation-api.test.mjs`: isolated webhook integration checks.
- `scripts/check-lead-contract.mjs`: preserves the existing contact payload and validation contract.
- `scripts/live-lead-smoke.mjs`, `.github/workflows/lead-webhook-smoke.yml`: explicit one-record live acknowledgement check.
- `src/components/landing/Site.tsx`: compatibility exports for existing route imports.
- `src/styles.css`: responsive brand and component system.
- `src/routes/__root.tsx`, `public/site.webmanifest`: browser theme colors.
- `.github/workflows/landing-ui.yml`: baseline protection, validation and screenshot artifacts.
- `scripts/ui-review.mjs`: all-route browser review at six widths.
- `scripts/measure-home-baseline.mjs`: reproducible before/after homepage measurements.
- `scripts/capture-review-previews.mjs`: bounded visual-review previews and full PNG captures.
- `scripts/check-live-preview.mjs`: deployed-preview checks.
- `scripts/check-lint-regressions.mjs`: compare lint findings with the unchanged baseline.
- `docs/SANA-UI-REVIEW.md`: this review record.

## Validation and comparison

The first redesigned build passed production build, TypeScript, six unit tests, route checks and Chromium review of all six routes at 360, 390, 430, 768, 1024 and 1440px. These checks cover family switching, keyboard focus, direct family links, attribution, image decoding, section navigation, technical-table alignment, number/icon legibility and three-field product forms and a four-field homepage form. Manual visual inspection covered the home, BHA5000 and FS-205 at mobile and desktop widths. Final runs additionally collect console errors and verify the deployed preview.

Full repository lint is run and its JSON report retained. The baseline itself has formatting errors and existing Fast Refresh warnings. The regression check compares finding signatures and multiplicities against the immutable baseline, fails for any additional finding and reports remaining baseline errors explicitly. It preserves product content while reporting remaining pre-existing formatting findings.

Final before/after homepage heights are recorded in `home-comparison.json` in the latest workflow artifact. Measurements compare the original all-five-device homepage with each selected family in the current design; all five devices remain accessible through the selector and the hero slideshow. The browser review checks the two-second slide interval, pause, all five manual choices and return-to-home links.

[Before/after measurements and full PNG screenshots](https://github.com/mo90mosleh/ortanes-leb-gift/actions/runs/39681761176/artifacts/12384577593) are available in the initial review artifact. Each final workflow run saves updated screenshots, console checks, lint JSON, measurements and live-preview results as `landing-ui-review` (seven-day retention). See the latest run for the PR branch in [GitHub Actions](https://github.com/mo90mosleh/ortanes-leb-gift/actions/workflows/landing-ui.yml).
