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
export function validateLead(fields: LeadFields): LeadErrors {
  const errors: LeadErrors = {};
  if (fields.name.trim().length < 3 || fields.name.length > 100)
    errors.name = "نام و نام خانوادگی را کامل وارد کنید.";
  if (!/^09\d{9}$/.test(normalizeMobile(fields.mobile)))
    errors.mobile = "شماره موبایل معتبر ایران را وارد کنید؛ مانند ۰۹۱۲۳۴۵۶۷۸۹.";
  if (fields.organization.trim().length < 2 || fields.organization.length > 150)
    errors.organization = "نام آزمایشگاه را وارد کنید.";
  return errors;
}
export type SubmissionResult = { status: "submitted" };
export type SubmissionHandler = (payload: LeadPayload) => Promise<SubmissionResult>;
// Public by design: the owner approved direct n8n submission from GitHub Pages.
export const consultationEndpoint =
  import.meta.env?.["VITE_CONSULTATION_API_URL"] ||
  "https://n8n.alecasgari.com/webhook/83591aad-47e3-475b-99a9-2f3d6d408e00";
export const submitConsultation: SubmissionHandler = async (payload) => {
  const response = await fetch(consultationEndpoint, {
    method: "POST",
    mode: "cors",
    credentials: "omit",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...payload,
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
      time: new Date().toISOString(),
    }),
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new Error("The webhook did not acknowledge the request");
  await response.body?.cancel();
  return { status: "submitted" };
};
