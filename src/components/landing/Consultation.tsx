import { useRef, useState } from "react";
import { ArrowLeft, Phone } from "lucide-react";
import type { FormEvent } from "react";
import type { Product } from "./products";
import { readAttribution } from "@/lib/attribution";
import { normalizeMobile, submitConsultation, validateLead } from "@/lib/consultation";
import type { LeadErrors, LeadFields, SubmissionHandler } from "@/lib/consultation";
const empty: LeadFields = { name: "", organization: "", mobile: "" };
export function Consultation({
  product,
  handler = submitConsultation,
}: {
  product: Product;
  handler?: SubmissionHandler;
}) {
  const [fields, setFields] = useState<LeadFields>(empty);
  const [errors, setErrors] = useState<LeadErrors>({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const form = useRef<HTMLFormElement>(null);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    const next = validateLead(fields);
    setErrors(next);
    setMessage("");
    if (Object.keys(next).length) {
      requestAnimationFrame(() =>
        form.current?.querySelector<HTMLInputElement>('[aria-invalid="true"]')?.focus(),
      );
      return;
    }
    setBusy(true);
    try {
      const result = await handler({
        name: fields.name.trim(),
        mobile: normalizeMobile(fields.mobile),
        organization: fields.organization.trim(),
        productModel: product.model,
        manufacturer: product.manufacturer,
        productCategory: product.category,
        landingPage: product.route,
        utm: readAttribution(),
      });
      setMessage(
        result.status === "not-connected"
          ? "اطلاعات از نظر ساختار بررسی شد و درخواستی ارسال نشده است. برای مشاوره با ۰۲۶ ۳۳۱۰۷ تماس بگیرید."
          : "درخواست شما توسط سامانه دریافت شد.",
      );
    } catch {
      setMessage("ارسال درخواست انجام نشد. لطفاً دوباره تلاش کنید یا با کارشناسان تماس بگیرید.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="consult-section" id="consultation">
      <div className="consult-intro">
        <span className="eyebrow">همراه شما در انتخاب</span>
        <h2>
          انتخاب مطمئن،
          <br />
          با شناخت نیاز مرکز شما.
        </h2>
        <p>
          برای بررسی مشخصات <bdi>{product.model}</bdi> و شرایط خرید، با کارشناسان SANA در ارتباط
          باشید.
        </p>
        <a className="phone-link" href="tel:+982633107">
          <span>تماس با کارشناس</span>
          <span className="phone-number">
            <bdi>۰۲۶ ۳۳۱۰۷</bdi>
            <Phone className="cta-icon" size={20} strokeWidth={2} aria-hidden="true" />
          </span>
        </a>
      </div>
      <form
        ref={form}
        onSubmit={submit}
        noValidate
        aria-label={`فرم مشاوره ${product.model}`}
        aria-busy={busy}
      >
        <p className="form-product">
          دستگاه انتخاب‌شده <strong dir="ltr">{product.name}</strong>
        </p>
        <div className="form-grid">
          {(["name", "organization", "mobile"] as const).map((key) => (
            <div className={`field${key === "mobile" ? " full" : ""}`} key={key}>
              <label htmlFor={`lead-${key}`}>
                {
                  {
                    name: "نام و نام خانوادگی",
                    mobile: "شماره موبایل",
                    organization: "نام آزمایشگاه",
                  }[key]
                }{" "}
                <span aria-hidden="true">*</span>
              </label>
              <input
                id={`lead-${key}`}
                name={key}
                value={fields[key]}
                onChange={(e) => setFields({ ...fields, [key]: e.target.value })}
                type={key === "mobile" ? "tel" : "text"}
                inputMode={key === "mobile" ? "tel" : "text"}
                dir={key === "mobile" ? "ltr" : "rtl"}
                autoComplete={
                  {
                    name: "name",
                    mobile: "tel",
                    organization: "organization",
                  }[key]
                }
                maxLength={key === "mobile" ? 20 : key === "name" ? 100 : 150}
                required
                aria-invalid={!!errors[key]}
                aria-describedby={errors[key] ? `error-${key}` : undefined}
              />
              {errors[key] && (
                <p className="field-error" id={`error-${key}`}>
                  {errors[key]}
                </p>
              )}
            </div>
          ))}
        </div>
        <p className="small">اطلاعات واردشده در این نسخه ارسال یا ذخیره نمی‌شوند.</p>
        <button className="button primary full" type="submit" disabled={busy}>
          <span className="button-label">{busy ? "در حال بررسی…" : "بررسی اطلاعات درخواست"}</span>
          <ArrowLeft className="cta-icon" size={20} strokeWidth={2} aria-hidden="true" />
        </button>
        <p className="submission-message" role="status" aria-live="polite">
          {message}
        </p>
      </form>
    </section>
  );
}

