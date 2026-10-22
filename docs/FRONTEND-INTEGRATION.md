# Consultation delivery

The homepage and all five product pages share `Consultation`. Each form collects full name, laboratory name and an Iranian mobile number. The homepage additionally requires a device selected from the CBC/POCT dropdown; device pages retain their fixed device. Homepage CTAs in the hero, product browser and closing banner point to the form.

The browser sends JSON to the same-origin `POST /api/consultation` endpoint. The server validates contact fields and the selected model, derives manufacturer/category from the existing catalog, normalizes mobile digits, and forwards the bounded payload to `SANA_LEAD_WEBHOOK_URL`. The actual destination is configured only in the Render service environment; it is never committed or included in browser JavaScript. Browser CORS permission from n8n is not required.

Payload:

```json
{
  "name": "نام و نام خانوادگی",
  "organization": "نام آزمایشگاه",
  "mobile": "09xxxxxxxxx",
  "productModel": "BHA5000",
  "manufacturer": "Getein",
  "productCategory": "CBC",
  "landingPage": "/",
  "utm": { "utm_source": "campaign", "utm_medium": "qr" }
}
```

`landingPage` is `/` for homepage requests and the existing product route for device pages. Attribution retains the existing five-key capture behavior. Additional fields, spoofed product metadata and unsupported UTM keys are not forwarded. No city or request-type field is collected. Personal fields are not saved in browser storage or logged by the delivery endpoint.

Success is shown only after the configured webhook responds with a successful HTTP status. Network failure, timeout, invalid JSON acknowledgement and non-success status never produce a success message. The server request has a ten-second timeout and does not automatically retry. The UI disables controls while sending, rejects repeated submissions while pending, retains input on failure and clears contact fields after acknowledgement.

## Configuration and verification

Set `SANA_LEAD_WEBHOOK_URL` through Render service environment variables or a local ignored `.env` file. Preserve other service variables. Restart/deploy the service after changing configuration. Do not prefix this variable with `VITE_`.

Regular CI never posts to the production webhook. Unit tests mock the browser request; API tests use an isolated local HTTP receiver; browser tests intercept `/api/consultation`. They cover home and device payloads, normalization, validation, pending/duplicate handling, failure/retry and truthful acknowledgement.

The `Verify live consultation delivery` workflow sends one clearly labelled synthetic lead through the real homepage form only when manually dispatched or a commit is explicitly marked `[verify-webhook]`. Ordinary pushes skip that job. The record uses an unmistakable test name/organization and a synthetic phone number; it is not a real customer. A successful test confirms the configured webhook's HTTP acknowledgement, not the result of downstream n8n workflow steps.
