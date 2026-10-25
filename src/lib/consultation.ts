import type { Attribution } from "./attribution";
export type LeadFields = {
  name: string;
  mobile: string;
  organization: string;
};
export type LeadPayload = LeadFields & {
  productModel: string;
  manufacturer: string;
  productCategory: string;
  landingPage: string;
  utm: Attribution;
  honeypot?: string;
};
export type LeadErrors = Partial<Record<keyof LeadFields, string>>;
export function normalizeDigits(value: string) {
  return value
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
}
export function normalizeMobile(value: string) {
  return normalizeDigits(value)
    .replace(/[\s()-]/g, "")
    .replace(/^(?:\+98|0098|98)(9\d{9})$/, "0$1");
}
export function acceptsMobileEdit(value: string) {
  return /^[0-9]{0,11}$/.test(value) && (value === "" || value === "0" || value.startsWith("09"));
}
export function validateLead(fields: LeadFields): LeadErrors {
  const errors: LeadErrors = {};
  if (fields.name.trim().length < 3 || fields.name.length > 100)
    errors.name = "نام و نام خانوادگی را کامل وارد کنید.";
  if (!/^09[0-9]{9}$/.test(fields.mobile))
    errors.mobile = "شماره موبایل را با 09 و در ۱۱ رقم انگلیسی وارد کنید.";
  if (fields.organization.trim().length < 2 || fields.organization.length > 100)
    errors.organization = "نام آزمایشگاه را وارد کنید.";
  return errors;
}
export type SubmissionResult = { status: "submitted" };
export type SubmissionHandler = (payload: LeadPayload) => Promise<SubmissionResult>;
// Public by design: the owner approved direct n8n submission from GitHub Pages.
export const consultationEndpoint =
  import.meta.env?.["VITE_CONSULTATION_API_URL"] ||
  "https://n8n.alecasgari.com/webhook/83591aad-47e3-475b-99a9-2f3d6d408e00";
// Only enable this after the server's durable volume and real SOAP contract are ready.
// This flag and the gateway URL are public; CRM settings must never use VITE_ names.
const serverMode = import.meta.env?.["VITE_CONSULTATION_SERVER_MODE"] === "true";

export function createConsultationSender(
  useServer: boolean,
  endpoint = consultationEndpoint,
): SubmissionHandler {
  if (useServer && new URL(endpoint).pathname !== "/api/leads") {
    throw new Error("Server mode requires the durable gateway /api/leads endpoint");
  }
  // In-memory drafts survive transport failures, with no contact data in browser storage.
  const drafts = new Map<string, { submissionId: string; time: string }>();
  return async (payload) => {
    const key = JSON.stringify([
      payload.name,
      payload.mobile,
      payload.organization,
      payload.productModel,
      payload.manufacturer,
      payload.productCategory,
      payload.landingPage,
      ...["utm_campaign", "utm_source", "utm_medium", "utm_content", "utm_term"].map(
        (name) => payload.utm[name as keyof Attribution] || "",
      ),
      payload.honeypot || "",
    ]);
    let draft = useServer ? drafts.get(key) : undefined;
    if (useServer && !draft) {
      draft = { submissionId: crypto.randomUUID(), time: new Date().toISOString() };
      drafts.set(key, draft);
    }
    const body = {
      ...payload,
      honeypot: payload.honeypot || "",
      fullName: payload.name,
      labName: payload.organization,
      product: payload.productModel,
      company: payload.manufacturer,
      pageUrl:
        typeof window === "undefined"
          ? payload.landingPage
          : window.location.origin + window.location.pathname,
      campaign: payload.utm.utm_campaign || "",
      source: payload.utm.utm_source || "",
      medium: payload.utm.utm_medium || "",
      content: payload.utm.utm_content || "",
      term: payload.utm.utm_term || "",
      time: draft?.time || new Date().toISOString(),
    };
    const response = await fetch(endpoint, {
      method: "POST",
      mode: "cors",
      credentials: "omit",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft ? { ...body, submissionId: draft.submissionId } : body),
      signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) throw new Error("The submission endpoint did not acknowledge the request");
    await response.body?.cancel();
    drafts.delete(key);
    return { status: "submitted" };
  };
}

export const submitConsultation = createConsultationSender(serverMode);
