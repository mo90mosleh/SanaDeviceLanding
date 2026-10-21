# SANA interface refinement

Preview: https://sana-pr-preview.onrender.com/

## Audit and implementation

The existing application uses React, TanStack Start, Vite and a shared custom stylesheet, with Tailwind available. The product routes share one presentation component and the product catalog supplies their factual content. Vazirmatn remains the Persian typeface. The deployed version at `f56c922c5792988143e50ccefcc036d894eccf5a` is the comparison baseline.

The mobile homepage repeated five tall product cards beneath a large hero. Repeated descriptions, image panels and section gaps made discovery require substantial scrolling. The burgundy palette dominated the interface despite the three-color SANA asset. Transparent space inside that logo weakened its apparent size. Product details had opportunities for more consistent section headings, lighter surfaces, smaller feature panels and clearer FAQ affordances.

The revised homepage presents a short exhibition introduction, two authentic device photographs and a keyboard-accessible CBC/POCT selector. The active family uses compact horizontal cards on mobile and a grid on larger screens. Both families and all five routes remain in server-rendered HTML. Direct family links select the correct panel. Arrow keys, Home/End and Tab support keyboard exploration; switching preserves query parameters and attribution.

Detail pages retain every specification, advantage, application, workflow step, catalog link and FAQ from the existing content. Their shared presentation now has clear category/model hierarchy, consistent section headings, restrained informational blue accents and a neutral two-column technical table with explicit right alignment. Independent highlights retain descriptive symbols. The four outlined section links fit without horizontal scrolling; catalog and FAQ content remain below. The existing mobile consultation bar is retained with compact spacing. No new sticky overlays were introduced.

## Brand tokens

The authentic SANA PNG remains unchanged. Its transparent margins are removed only by its SVG display viewport. Device photographs and their proportions remain authentic, including the existing BHA5000 display crop of surplus white space.

| Token | Value | Use |
| --- | --- | --- |
| Logo green | `#028a3f` | Color sampled from the logo |
| Primary interaction | `#02753b` | Darker green for legible white CTA text |
| Primary hover | `#045c32` | Button feedback |
| Blue | `#0047bf` | Information, POCT identifiers and keyboard focus |
| Red | `#bf0115` | Limited exhibition highlight |
| Main text | `#142c35` | Headings and primary text |
| Secondary text | `#61747c` | Supporting copy |
| Border | `#dfe7eb` | Subtle separation |
| Neutral surface | `#f5f8fa` | Product images and section backgrounds |

Spacing, corner radii, shadows and colors share CSS variables. Interactive targets, visible focus states and reduced-motion preferences are preserved. Persian/Latin models and values use directional isolation.

## Scope protection

The redesign does not edit `Consultation.tsx`, `products.ts`, `src/lib/consultation.ts` or `src/lib/attribution.ts`. CI compares all four files against the immutable baseline. Form fields, validation, payload structure, existing submission behavior and attribution are preserved. No API, webhook, Sheets, Telegram or backend integration was added or changed. Existing route files and SEO content remain; the shared browser theme color follows the new palette.

## Modified files

- `src/components/landing/BrandLogo.tsx`: shared authentic logo viewport.
- `src/components/landing/SiteChrome.tsx`: header and footer.
- `src/components/landing/HomePage.tsx`: hero, family selector and reusable compact product cards.
- `src/components/landing/ProductDetail.tsx`: shared product presentation.
- `src/components/landing/Site.tsx`: compatibility exports for existing route imports.
- `src/styles.css`: responsive brand and component system.
- `src/routes/__root.tsx`, `public/site.webmanifest`: browser theme colors.
- `.github/workflows/landing-ui.yml`: baseline protection, validation and screenshot artifacts.
- `scripts/ui-review.mjs`: all-route browser review at six widths.
- `scripts/measure-home-baseline.mjs`: reproducible before/after homepage measurements.
- `scripts/capture-review-previews.mjs`: bounded visual-review previews and full PNG captures.
- `scripts/check-live-preview.mjs`: deployed-preview checks.
- `docs/SANA-UI-REVIEW.md`: this review record.

## Validation and comparison

Final results and measured homepage heights will be recorded after the workflow completes. Screenshots and JSON measurements are saved in the `landing-ui-review` workflow artifact. Measurements explicitly compare the original all-five-device homepage with each selected family in the new design; all five devices remain accessible through the selector.
