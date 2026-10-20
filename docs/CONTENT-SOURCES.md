# Product evidence and live-site audit

Reviewed 20 October 2026. Scope: public frontend only. No production form submissions or requests to lead-processing services were made.

## Public journey

The live homepage at https://cbc.ortanes.com opens a modal selector with BHA3000, BHA5000 and BHA5100. Selecting any model renders its page at `/` without a URL change. The header offers product switching and telephone contact; pages contain a hero, feature grid, technical specifications (5000/5100), catalog link, FAQ, consultation CTA and mobile sticky CTA. BHA3000 includes an expired device giveaway across the selector, hero, offer section and FAQ.

The implementation replaces the modal with a five-card homepage, preserves all three model identities, and adds `/cbc/bha3000`, `/cbc/bha5000`, `/cbc/bha5100`, `/poct/fs-114`, `/poct/fs-205`. There were no separate CBC pathnames in the observed live journey to preserve. Original technical hostname remains unchanged.

## Primary evidence

All specifications use the supplied model-specific PDFs under `public/product-assets/*/catalogs/`. Wondfo PDFs are image-based; both pages of each were rendered and reviewed visually. Getein technical pages and relevant feature pages were also reviewed.

| Model   | Evidence                                              | Key verified information                                                                                                                                                                   |
| ------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| BHA3000 | Supplied GETEIN-BHA3000-Catalog.pdf, technical page 4 | 3-part, 21 parameters, venous 6 µL, pre-dilution capillary 20 µL, 10.4-inch display, 10,000 results, 16 kg                                                                                 |
| BHA5000 | Supplied GETEIN-BHA5000-Catalog.pdf, pages 2–4        | 5-part, 25 parameters, up to 60 samples/hour, 15 µL venous sample, internal printer, 10.4-inch display, 10,000 results, 21 kg                                                              |
| BHA5100 | Supplied GETEIN-BHA5100-Catalog.pdf, pages 2–4        | 5-part, 25 parameters, 60 tests/hour, laser + sheath flow, bidirectional LIS/HIS, STAT position, 100,000 results, 30 kg                                                                    |
| FS-114  | Supplied fs-114-catalog.pdf, page 2                   | Full name FIA Meter II Plus SE, REF W911; 8-inch capacitive display, 7800 mAh rechargeable battery, thermal printer, Wi-Fi/LIS/HIS, 239 × 278 × 148 mm, 3.3 kg                             |
| FS-205  | Supplied fs-205-catalog.pdf, page 2                   | FIA Meter III Plus, REF W914; 20 random-access channels, internal incubation, stated 200 tests/hour, 10-inch screen, printer, LIS/HIS, automatic cartridge ejection, approximately 19.5 kg |

Cardiac, inflammatory, metabolic and thyroid/hormone examples appear in the assay tables on page 1 of **each** Finecare model catalog. No universal compatibility claim is made. Each assay requires verification of exact kit code, device version, specimen, reaction time and IFU. Throughput is attributed to the manufacturer and qualified for actual workflow. No diagnostic outcome, stock, delivery, discount or warranty promise was invented.

## Images and discrepancies

SANA logo and Wondfo/Finecare logos are from the supplied Desktop folder. Device photos FS-114 and FS-205 are also from that folder. Images were proportionally resized and converted; physical device appearance was not modified. Favicon uses the complete original SANA wordmark on a square canvas.

The old BHA5000 catalog and live photo visibly show a veterinary model label. That picture was not reused. The authentic current BHA5000 image comes from its [official manufacturer page](https://www.getein.com/bha-5000-automatic-hematology-analyzer_p171.html). BHA5100 photo and authentic Getein logo come from the [official product page](https://www.getein.com/bha-5100-automatic-hematology-analyzer-supplier_p95.html). BHA3000 uses the repository's official product photograph.

The [current manufacturer listing](https://www.getein.com/products) describes a BHA5000 variant with a 10.1-inch display and 100,000-result memory, differing from the supplied catalog and live specifications. Page copy explicitly follows the supplied catalog (10.4-inch / 10,000) and tells buyers to confirm offered configuration. Confirm the hardware revision before approving publication.

Desktop originals and synced `sources/` archives remain untouched. No unrelated regulatory files were extracted or published.
