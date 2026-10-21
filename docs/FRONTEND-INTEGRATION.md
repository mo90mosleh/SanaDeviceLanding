# Frontend consultation boundary

`src/lib/consultation.ts` defines the typed payload, validation and the only submission boundary: `submitConsultation`. Its default returns `{status: 'not-connected'}` and performs no network access, logging or storage. The UI explicitly states that online submission is not connected and no request was sent. It never presents default submission as successful.

`Consultation` accepts an optional `SubmissionHandler` for a later separately managed integration. The form has only three required fields: full name, laboratory name and mobile. City and request type are not collected or included in the payload. The frontend prepares name, normalized Iranian mobile, organization, model, manufacturer, category, canonical landing pathname and the five UTM fields. Personal information stays in component memory only. A configured handler must return `submitted` only after actual acknowledgement and throw on failure; the form already handles pending, failure and acknowledgement states. No external handler is configured here.

`src/lib/attribution.ts` captures the five supported UTM keys in sessionStorage. New campaign parameters replace old campaign attribution to avoid mixed campaigns; internal links retain the saved campaign in the same tab. Values are limited to 200 characters. Malformed/disabled storage is handled without breaking navigation. Personal form fields are never persisted.

Required fields have associated labels and accessible error messages. Persian/Arabic digits and +98/0098 mobile prefixes normalize to 09xxxxxxxxx. Invalid fields focus the first error. No analytics, database, external automation, backend lead service or production submission endpoint was added, inspected, or contacted.

Build and routing continue to use the repository's existing TanStack Start/Lovable configuration. Deep links are actual server routes, not a static fallback workaround. Hosting/domain configuration was not migrated. Do not deploy or merge without the owner's explicit approval.

