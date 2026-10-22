import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Check, Phone, X } from "lucide-react";
import type { FormEvent } from "react";
import { products } from "./products";
import type { Product } from "./products";
import { readAttribution } from "@/lib/attribution";
import { normalizeMobile, submitConsultation, validateLead } from "@/lib/consultation";
import type { LeadErrors, LeadFields, SubmissionHandler } from "@/lib/consultation";

const empty: LeadFields = { name: "", organization: "", mobile: "" };
type FormErrors = LeadErrors & { product?: string };

export function Consultation({
  product,
  handler = submitConsultation,
}: {
  product?: Product;
  handler?: SubmissionHandler;
}) {
  const [fields, setFields] = useState<LeadFields>(empty);
  const [selectedId, setSelectedId] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [successOpen, setSuccessOpen] = useState(false);
  const successDialog = useRef<HTMLDialogElement>(null);
  const form = useRef<HTMLFormElement>(null);
  const pending = useRef(false);
  const selectedProduct = product || products.find((item) => item.id === selectedId);

  useEffect(() => {
    const dialog = successDialog.current;
    if (!successOpen || !dialog) return;
    const previousOverflow = document.body.style.overflow;
    const returnFocus = form.current?.querySelector<HTMLButtonElement>('button[type="submit"]');
    document.body.style.overflow = "hidden";
    dialog.showModal();
    dialog.querySelector<HTMLButtonElement>(".success-confirm")?.focus();
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
      returnFocus?.focus({ preventScroll: true });
    };
  }, [successOpen]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (pending.current) return;
    const next: FormErrors = validateLead(fields);
    if (!selectedProduct) next.product = "دستگاه موردنظر را انتخاب کنید.";
    setErrors(next);
    setMessage("");
    if (Object.keys(next).length || !selectedProduct) {
      requestAnimationFrame(() =>
        form.current
          ?.querySelector<HTMLInputElement | HTMLSelectElement>('[aria-invalid="true"]')
          ?.focus(),
      );
      return;
    }
    pending.current = true;
    setBusy(true);
    try {
      const result = await handler({
        name: fields.name.trim(),
        mobile: normalizeMobile(fields.mobile),
        organization: fields.organization.trim(),
        productModel: selectedProduct.model,
        manufacturer: selectedProduct.manufacturer,
        productCategory: selectedProduct.category,
        landingPage: product ? product.route : "/",
        utm: readAttribution(),
      });
      if (result.status !== "submitted") throw new Error("Submission was not acknowledged");
      setFields(empty);
      if (!product) setSelectedId("");
      setSuccessOpen(true);
    } catch {
      setMessage("ارسال درخواست تأیید نشد. لطفاً دوباره تلاش کنید یا با کارشناسان تماس بگیرید.");
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  return (
    <section className="consult-section" id="consultation" aria-labelledby="consultation-heading">
      <div className="consult-intro">
        <span className="eyebrow">همراه شما در انتخاب</span>
        <h2 id="consultation-heading">
          انتخاب مطمئن،
          <br />
          با شناخت نیاز مرکز شما.
        </h2>
        <p>
          {product ? (
            <>
              برای بررسی مشخصات <bdi>{product.model}</bdi> و شرایط خرید، با کارشناسان سانا در ارتباط
              باشید.
            </>
          ) : (
            "دستگاه موردنظر را انتخاب کنید و اطلاعات تماس آزمایشگاه خود را برای دریافت مشاوره ثبت کنید."
          )}
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
        aria-label={product ? `فرم مشاوره ${product.model}` : "فرم مشاوره انتخاب دستگاه"}
        aria-busy={busy}
      >
        {product && (
          <p className="form-product">
            دستگاه انتخاب‌شده <strong dir="ltr">{product.name}</strong>
          </p>
        )}
        <div className="form-grid">
          {!product && (
            <div className="field full">
              <label htmlFor="lead-product">
                دستگاه موردنظر <span aria-hidden="true">*</span>
              </label>
              <select
                id="lead-product"
                name="product"
                value={selectedId}
                onChange={(event) => {
                  setSelectedId(event.target.value);
                  setMessage("");
                }}
                disabled={busy}
                required
                aria-invalid={!!errors.product}
                aria-describedby={errors.product ? "error-product" : undefined}
              >
                <option value="" disabled>
                  انتخاب دستگاه
                </option>
                {(["CBC", "POCT"] as const).map((family) => (
                  <optgroup
                    key={family}
                    label={family === "CBC" ? "CBC — هماتولوژی" : "POCT — تشخیص سریع"}
                  >
                    {products
                      .filter((item) => item.category === family)
                      .map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                  </optgroup>
                ))}
              </select>
              {errors.product && (
                <p className="field-error" id="error-product">
                  {errors.product}
                </p>
              )}
            </div>
          )}
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
                onChange={(event) => {
                  const value = event.target.value;
                  setFields((previous) => ({ ...previous, [key]: value }));
                  setMessage("");
                }}
                disabled={busy}
                type={key === "mobile" ? "tel" : "text"}
                inputMode={key === "mobile" ? "tel" : "text"}
                dir={key === "mobile" ? "ltr" : "rtl"}
                autoComplete={{ name: "name", mobile: "tel", organization: "organization" }[key]}
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
        <p className="small">
          اطلاعات تماس شما برای پیگیری درخواست مشاوره در اختیار سانا قرار می‌گیرد.
        </p>
        <button className="button primary full" type="submit" disabled={busy}>
          <span className="button-label">{busy ? "در حال ارسال…" : "ثبت درخواست مشاوره"}</span>
          <ArrowLeft className="cta-icon" size={20} strokeWidth={2} aria-hidden="true" />
        </button>
        <p
          className="submission-message"
          data-state={message ? "error" : undefined}
          role="status"
          aria-live="polite"
        >
          {message}
        </p>
      </form>
      <dialog
        ref={successDialog}
        className="success-dialog"
        aria-labelledby="consultation-success-title"
        aria-describedby="consultation-success-description"
        onClose={() => setSuccessOpen(false)}
        onKeyDown={(event) => {
          if (event.key !== "Tab") return;
          const buttons = event.currentTarget.querySelectorAll<HTMLButtonElement>("button");
          const first = buttons.item(0);
          const last = buttons.item(buttons.length - 1);
          if (document.activeElement === (event.shiftKey ? first : last)) {
            event.preventDefault();
            (event.shiftKey ? last : first)?.focus();
          }
        }}
      >
        <button
          type="button"
          className="success-close"
          aria-label="بستن پیام موفقیت"
          onClick={() => setSuccessOpen(false)}
        >
          <X size={22} aria-hidden="true" />
        </button>
        <span className="success-symbol" aria-hidden="true">
          <Check size={36} strokeWidth={2.4} />
        </span>
        <h2 id="consultation-success-title">اطلاعات با موفقیت ثبت شد.</h2>
        <p id="consultation-success-description">درخواست شما برای پیگیری به سانا ارسال شد.</p>
        <button
          type="button"
          className="button primary success-confirm"
          onClick={() => setSuccessOpen(false)}
        >
          متوجه شدم
        </button>
      </dialog>
    </section>
  );
}
