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
export type SubmissionResult = { status: "not-connected" } | { status: "submitted" };
export type SubmissionHandler = (payload: LeadPayload) => Promise<SubmissionResult>;
// Sole integration boundary. No endpoint, persistence, logging, or network request.
export const submitConsultation: SubmissionHandler = async (_payload) => ({
  status: "not-connected",
});

