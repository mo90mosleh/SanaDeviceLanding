import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Check, Phone, X } from "lucide-react";
import type { ComponentProps, FormEvent, KeyboardEvent } from "react";
import { ProductImage } from "./ProductImage";
import { products } from "./products";
import type { Product } from "./products";
import { readAttribution } from "@/lib/attribution";
import {
  acceptsMobileEdit,
  submitConsultation,
  validateLead,
  SubmissionError,
} from "@/lib/consultation";
import type { LeadErrors, LeadFields, SubmissionHandler } from "@/lib/consultation";

const empty: LeadFields = { name: "", organization: "", mobile: "" };
type FormErrors = LeadErrors & { product?: string };

export function ConsultationLink(props: ComponentProps<"a">) {
  return (
    <a
      {...props}
      href="#consultation"
      onClick={(event) => {
        if (!window.matchMedia("(max-width: 640px)").matches) return;
        event.preventDefault();
        window.dispatchEvent(new CustomEvent("sana:consultation", { detail: event.currentTarget }));
      }}
    />
  );
}

function containFocus(event: KeyboardEvent<HTMLDialogElement>) {
  if (event.key !== "Tab") return;
  const controls = event.currentTarget.querySelectorAll<HTMLElement>(
    "button:not(:disabled), input:not(:disabled), select:not(:disabled), a[href]",
  );
  const first = controls.item(0);
  const last = controls.item(controls.length - 1);
  if (document.activeElement === (event.shiftKey ? first : last)) {
    event.preventDefault();
    (event.shiftKey ? last : first)?.focus();
  }
}

export function Consultation({
  product,
  handler = submitConsultation,
}: {
  product?: Product;
  handler?: SubmissionHandler;
}) {
  const [fields, setFields] = useState<LeadFields>(empty);
  const [honeypot, setHoneypot] = useState("");
  const [digitsOpen, setDigitsOpen] = useState(false);
  const digitsDialog = useRef<HTMLDialogElement>(null);
  const phoneInput = useRef<HTMLInputElement>(null);
  const [selectedId, setSelectedId] = useState(product?.id || "");
  const [mobile, setMobile] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const formDialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const completing = useRef(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [successOpen, setSuccessOpen] = useState(false);
  const successDialog = useRef<HTMLDialogElement>(null);
  const form = useRef<HTMLFormElement>(null);
  const pending = useRef(false);
  const selectedProduct = (!mobile && product) || products.find((item) => item.id === selectedId);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 640px)");
    const update = () => {
      setMobile(media.matches);
      if (!media.matches) setFormOpen(false);
    };
    const open = (event: Event) => {
      if (!media.matches) return;
      opener.current = (event as CustomEvent<HTMLElement>).detail;
      completing.current = false;
      setFormOpen(true);
    };
    update();
    media.addEventListener("change", update);
    window.addEventListener("sana:consultation", open);
    return () => {
      media.removeEventListener("change", update);
      window.removeEventListener("sana:consultation", open);
    };
  }, []);

  useEffect(() => {
    const dialog = formDialog.current;
    if (!formOpen || !mobile || !dialog) return;
    dialog.showModal();
    dialog.querySelector<HTMLButtonElement>(".consult-close")?.focus({ preventScroll: true });
    const resize = () => {
      dialog.style.setProperty(
        "--consult-viewport",
        `${window.visualViewport?.height || window.innerHeight}px`,
      );
      dialog.style.setProperty("--consult-offset", `${window.visualViewport?.offsetTop || 0}px`);
    };
    resize();
    window.visualViewport?.addEventListener("resize", resize);
    window.visualViewport?.addEventListener("scroll", resize);
    return () => {
      window.visualViewport?.removeEventListener("resize", resize);
      window.visualViewport?.removeEventListener("scroll", resize);
      dialog.close();
      if (!completing.current) opener.current?.focus({ preventScroll: true });
    };
  }, [formOpen, mobile]);

  useEffect(() => {
    const dialog = successDialog.current;
    if (!successOpen || !dialog) return;
    const returnFocus = mobile
      ? opener.current
      : form.current?.querySelector<HTMLButtonElement>('button[type="submit"]');
    dialog.showModal();
    dialog.querySelector<HTMLButtonElement>(".success-confirm")?.focus();
    return () => {
      dialog.close();
      returnFocus?.focus({ preventScroll: true });
    };
  }, [successOpen, mobile]);

  useEffect(() => {
    const dialog = digitsDialog.current;
    if (!digitsOpen || !dialog) return;
    const returnFocus = phoneInput.current;
    dialog.showModal();
    dialog.querySelector<HTMLButtonElement>("button")?.focus();
    return () => {
      dialog.close();
      returnFocus?.focus({ preventScroll: true });
    };
  }, [digitsOpen]);

  const modalOpen = (mobile && formOpen) || successOpen || digitsOpen;
  useEffect(() => {
    if (!modalOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [modalOpen]);

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
        mobile: fields.mobile,
        organization: fields.organization.trim(),
        productModel: selectedProduct.model,
        manufacturer: selectedProduct.manufacturer,
        productCategory: selectedProduct.category,
        landingPage: product ? product.route : "/",
        utm: readAttribution(),
        honeypot,
      });
      if (result.status !== "submitted") throw new Error("Submission was not acknowledged");
      setFields(empty);
      setHoneypot("");
      setSelectedId(product?.id || "");
      completing.current = true;
      setFormOpen(false);
      setSuccessOpen(true);
    } catch (error) {
      if (error instanceof SubmissionError) {
        setMessage(
          error.code === "TIMEOUT"
            ? "پاسخ سرور در مهلت مقرر نرسید (TIMEOUT). ممکن است درخواست ثبت شده باشد؛ پیش از ارسال مجدد با کارشناسان تماس بگیرید."
            : error.code === "NETWORK"
              ? "ارتباط با سرور تأیید نشد (NETWORK). اینترنت یا VPN را بررسی کنید و با شبکه دیگری امتحان کنید."
              : `سرور ثبت درخواست خطا داد (HTTP ${error.status}). لطفاً با کارشناسان تماس بگیرید.`,
        );
      } else {
        setMessage("ارسال درخواست تأیید نشد (CLIENT). لطفاً با کارشناسان تماس بگیرید.");
      }
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  const formContent = (
    <form
      ref={form}
      onSubmit={submit}
      noValidate
      aria-label={product ? `فرم مشاوره ${product.model}` : "فرم مشاوره انتخاب دستگاه"}
      aria-busy={busy}
    >
      <div className="form-honeypot" aria-hidden="true">
        <label htmlFor="lead-website">Website</label>
        <input
          id="lead-website"
          type="text"
          name="website"
          autoComplete="off"
          tabIndex={-1}
          value={honeypot}
          onChange={(event) => setHoneypot(event.target.value)}
        />
      </div>
      {mobile && (
        <fieldset className="consult-products" disabled={busy}>
          <legend>دستگاه موردنظر</legend>
          {products
            .filter((item) => !product || item.category === product.category)
            .map((item) => (
              <label
                className="consult-product-option"
                key={item.id}
                data-family={item.category.toLowerCase()}
              >
                <input
                  type="radio"
                  name="product"
                  value={item.id}
                  checked={selectedId === item.id}
                  onChange={() => {
                    setSelectedId(item.id);
                    setMessage("");
                  }}
                  required
                  aria-invalid={!!errors.product}
                  aria-describedby={errors.product ? "error-product" : undefined}
                />
                <span className="consult-product-photo">
                  <ProductImage product={item} width={76} height={76} loading="lazy" />
                </span>
                <span className="consult-product-copy">
                  <strong dir="ltr">{item.name}</strong>
                  <span>{item.highlights.slice(0, 2).join(" · ")}</span>
                </span>
                <span className="consult-product-check" aria-hidden="true">
                  <Check size={14} />
                </span>
              </label>
            ))}
          {errors.product && (
            <p className="field-error" id="error-product">
              {errors.product}
            </p>
          )}
        </fieldset>
      )}
      {product && !mobile && (
        <p className="form-product">
          دستگاه انتخاب‌شده <strong dir="ltr">{product.name}</strong>
        </p>
      )}
      <div className="form-grid">
        {!product && !mobile && (
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
              ref={key === "mobile" ? phoneInput : undefined}
              id={`lead-${key}`}
              name={key}
              value={fields[key]}
              onChange={(event) => {
                const value = event.target.value;
                if (key === "mobile") {
                  if (/[۰-۹٠-٩]/u.test(value)) {
                    setDigitsOpen(true);
                    return;
                  }
                  if (!acceptsMobileEdit(value)) {
                    setErrors((previous) => ({
                      ...previous,
                      mobile: "شماره موبایل را با 09 و فقط با ارقام انگلیسی وارد کنید.",
                    }));
                    return;
                  }
                  setErrors((previous) => {
                    const next = { ...previous };
                    delete next.mobile;
                    return next;
                  });
                }
                setFields((previous) => ({ ...previous, [key]: value }));
                setMessage("");
              }}
              onBeforeInput={
                key === "mobile"
                  ? (event) => {
                      if (/[۰-۹٠-٩]/u.test((event.nativeEvent as InputEvent).data || "")) {
                        event.preventDefault();
                        setDigitsOpen(true);
                      }
                    }
                  : undefined
              }
              onPaste={
                key === "mobile"
                  ? (event) => {
                      if (/[۰-۹٠-٩]/u.test(event.clipboardData.getData("text"))) {
                        event.preventDefault();
                        setDigitsOpen(true);
                      }
                    }
                  : undefined
              }
              placeholder={
                key === "mobile"
                  ? "09123456789"
                  : mobile
                    ? {
                        name: "مثال: دکتر مریم احمدی",
                        organization: "مثال: آزمایشگاه پاتوبیولوژی مهر",
                      }[key]
                    : undefined
              }
              disabled={busy}
              type={key === "mobile" ? "tel" : "text"}
              inputMode={key === "mobile" ? "numeric" : "text"}
              pattern={key === "mobile" ? "09[0-9]{9}" : undefined}
              dir={key === "mobile" ? "ltr" : "rtl"}
              autoComplete={{ name: "name", mobile: "tel", organization: "organization" }[key]}
              maxLength={key === "mobile" ? 11 : 100}
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
        <span className="button-label">
          {busy ? "در حال ارسال" : "ثبت درخواست مشاوره"}
        </span>
        {busy ? (
          <span className="submission-loader" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
        ) : (
          !mobile && <ArrowLeft className="cta-icon" size={20} strokeWidth={2} aria-hidden="true" />
        )}
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
  );

  return (
    <>
      {!mobile && (
        <section
          className="consult-section"
          id="consultation"
          aria-labelledby="consultation-heading"
        >
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
                  برای بررسی مشخصات <bdi>{product.model}</bdi> و شرایط خرید، با کارشناسان سانا در
                  ارتباط باشید.
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
          {formContent}
        </section>
      )}
      {mobile && (
        <dialog
          id="consultation"
          ref={formDialog}
          className="consult-dialog"
          aria-labelledby="consult-dialog-title"
          aria-describedby="consult-dialog-description"
          onClose={(event) => {
            if (!event.currentTarget.open) setFormOpen(false);
          }}
          onKeyDown={containFocus}
          onClick={(event) => {
            if (event.target === event.currentTarget) setFormOpen(false);
          }}
        >
          <header className="consult-dialog-header">
            <div>
              <h2 id="consult-dialog-title">درخواست مشاوره خرید</h2>
              <p id="consult-dialog-description">
                محصول موردنظر را انتخاب کنید و فرم کوتاه را تکمیل کنید.
              </p>
            </div>
            <button
              type="button"
              className="consult-close"
              aria-label="بستن فرم مشاوره"
              onClick={() => setFormOpen(false)}
            >
              <X size={22} aria-hidden="true" />
            </button>
          </header>
          <div className="consult-dialog-body">{formContent}</div>
        </dialog>
      )}
      <div className="mobile-cta">
        <ConsultationLink className="button primary">
          <span className="button-label">
            {product ? (
              <>
                مشاوره خرید <bdi>{product.model}</bdi>
              </>
            ) : (
              "درخواست مشاوره خرید"
            )}
          </span>
          <ArrowLeft className="cta-icon" size={20} strokeWidth={2} aria-hidden="true" />
        </ConsultationLink>
        <a href="tel:+982633107" className="mobile-phone" aria-label="تماس با سانا، ۰۲۶ ۳۳۱۰۷">
          <Phone className="cta-icon" size={20} strokeWidth={2} aria-hidden="true" />
          <span>تماس</span>
        </a>
      </div>
      <dialog
        ref={successDialog}
        className="success-dialog"
        aria-labelledby="consultation-success-title"
        aria-describedby="consultation-success-description"
        onClose={(event) => {
          if (!event.currentTarget.open) setSuccessOpen(false);
        }}
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
      <dialog
        ref={digitsDialog}
        className="digits-dialog"
        role="alertdialog"
        aria-labelledby="digits-dialog-title"
        aria-describedby="digits-dialog-description"
        onClose={(event) => {
          if (!event.currentTarget.open) setDigitsOpen(false);
        }}
        onKeyDown={containFocus}
      >
        <span className="digits-symbol" aria-hidden="true" dir="ltr">
          123
        </span>
        <h2 id="digits-dialog-title">کیبورد را به انگلیسی تغییر دهید</h2>
        <p id="digits-dialog-description">
          شماره موبایل را فقط با اعداد انگلیسی و با شروع <bdi>09</bdi> وارد کنید.
        </p>
        <button className="button primary full" type="button" onClick={() => setDigitsOpen(false)}>
          متوجه شدم
        </button>
      </dialog>
    </>
  );
}
