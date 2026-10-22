# Consultation field mapping and success dialog

Requests preserve the existing internal payload and match the owner-confirmed Sheet1 headers: fullName, labName, mobile, campaign, source, medium, content, term, product, company, pageUrl and time. Missing UTM parameters stay empty. Existing spreadsheet rows are not rewritten.

After successful HTTP acknowledgement, a native modal confirms submission and the form is cleared. It supports a visible confirmation button, explicit close, Escape, contained keyboard focus, restored focus and background scrolling after dismissal. Failure preserves inputs and never opens the success dialog.

## Verified results

- The published homepage sent one clearly labelled synthetic record through the real n8n webhook and received HTTP 200. The live browser check verified the visible success popup and cleared contact fields/device selection: https://github.com/mo90mosleh/ortanes-leb-gift/actions/runs/39808193359
- A bounded Google Sheets read found that labelled record in Sheet1 row 85, with laboratory, product, manufacturer, page, all five supplied campaign values and time populated. No existing customer record was edited.
- Production build, TypeScript, six unit tests, eight route checks, twelve static-route browser checks and all thirty-six responsive route/width checks passed. The final browser matrix covers 360, 390, 430, 768, 1024 and 1440px, acknowledgement, failure/retry, duplicate blocking, popup focus containment, Escape, focus restoration and scroll restoration: https://github.com/mo90mosleh/ortanes-leb-gift/actions/runs/39809597162
- Lint comparison reports no introduced findings. One existing formatting error and six existing warnings remain in the immutable repository baseline.
- Publication continues through GitHub Pages; no Render deployment is part of this change.
