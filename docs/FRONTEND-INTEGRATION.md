# Consultation delivery and GitHub Pages

The homepage and all five product pages share `Consultation`. Each collects full name, laboratory name and an Iranian mobile number. The homepage additionally requires a device selected from the CBC/POCT dropdown; product pages retain their fixed device. Hero, product-browser and final-banner CTAs open the homepage consultation section.

Following the owner's explicit choice, the browser sends JSON directly to the n8n production webhook. Its URL is deliberately public in the client bundle. No backend proxy or Render deployment is required. `VITE_CONSULTATION_API_URL` optionally overrides the public destination at build time; it is not a secret variable. The endpoint must permit CORS from `https://mo90mosleh.github.io`, including OPTIONS, POST and Content-Type.

The n8n transport additionally sends `fullName` as an alias of `name`, matching the production webhook validator. Internal form fields and validation are unchanged.

Payload keys remain `name`, `organization`, `mobile`, `productModel`, `manufacturer`, `productCategory`, `landingPage`, and `utm`. `landingPage` is `/` for homepage requests and the existing product route for device pages. Existing phone normalization, validation and five-key attribution behavior are preserved. Personal contact fields are not written to browser storage.

Only a successful HTTP acknowledgement displays “اطلاعات با موفقیت ثبت شد.” and clears all fields, including the homepage selector. A successful n8n response can be plain text or JSON. Failure or a twenty-second timeout preserves input and shows an error. Pending controls are disabled, duplicate submission is blocked, and no automatic retries are performed. HTTP acknowledgement does not establish whether subsequent n8n steps completed.

## Static publication

`github-pages.yml` builds the existing TanStack Start application with its repository base path, exports its six server-rendered pages and authentic public assets, and reviews them on a plain static HTTP server before uploading a Pages artifact. Nested product URLs have real `index.html` files, so refreshes work without a server fallback. Product content, specifications, routes and SEO metadata remain intact. The repository's Pages source must be GitHub Actions; first-time enablement may require an administrator to select this in Settings → Pages.

Regular tests intercept the public endpoint and send no customer/test lead to n8n. Browser checks cover homepage/device payloads, normalized digits, pending/duplicate handling, errors, retry and acknowledged clearing. A separate read-only OPTIONS probe verifies the real CORS preflight. The `Verify live consultation delivery` workflow sends exactly one clearly labelled synthetic record only on manual dispatch or an explicit `[verify-webhook]` commit. That check verifies the published homepage, HTTP acknowledgement and cleared fields without claiming downstream workflow completion.
