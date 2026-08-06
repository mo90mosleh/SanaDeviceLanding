import { useState } from "react";
import { CheckCircle2, Loader2, ShieldCheck } from "lucide-react";

const HIDDEN_FIELDS = {
  campaign: "BHA3000-FreeDevice",
  source: "SMS",
  medium: "SMS Marketing",
  product: "GETEIN BHA3000",
  company: "Sana Shafabakhsh Raspina",
} as const;

export function LeadForm() {
  const [status, setStatus] = useState<"idle" | "loading" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const mobile = String(form.get("mobile") ?? "").trim();
    if (!/^09\d{9}$/.test(mobile)) {
      setError("شماره موبایل را به شکل صحیح وارد کنید. مثال: ۰۹۱۲۳۴۵۶۷۸۹");
      return;
    }
    setError(null);
    setStatus("loading");
    // آماده برای اتصال به CRM: مقادیر زیر همراه فیلدهای پنهان ارسال می‌شود.
    const payload = { ...Object.fromEntries(form.entries()), ...HIDDEN_FIELDS };
    console.info("lead", payload);
    setTimeout(() => setStatus("done"), 700);
  };

  return (
    <section id="lead-form" className="scroll-mt-20 bg-gradient-soft py-16 sm:py-24">
      <div className="mx-auto grid max-w-5xl items-center gap-10 px-5 lg:grid-cols-[1fr_minmax(0,420px)]">
        <div>
          <h2 className="text-2xl font-extrabold leading-relaxed sm:text-3xl">
            درخواست مشاوره رایگان طرح واگذاری دستگاه
          </h2>
          <p className="mt-4 text-base leading-8 text-muted-foreground">
            فقط سه فیلد کوتاه را تکمیل کنید. کارشناس محصول سانا شفابخش راسپینا در اسرع وقت با شما
            تماس می‌گیرد، نیاز آزمایشگاه شما را بررسی می‌کند و شرایط دقیق طرح را شفاف توضیح می‌دهد.
          </p>
          <ul className="mt-6 space-y-3 text-sm font-medium">
            {[
              "بدون هیچ هزینه و تعهد اولیه",
              "بررسی تخصصی حجم تست و مصرف ماهانه",
              "اعلام شفاف اعتبار خرید لوازم مصرفی",
            ].map((t) => (
              <li key={t} className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-ember" />
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-4xl border border-border bg-card p-6 shadow-card sm:p-8">
          {status === "done" ? (
            <div className="py-8 text-center">
              <CheckCircle2 className="mx-auto h-14 w-14 text-ember" />
              <h3 className="mt-4 text-xl font-extrabold">درخواست شما ثبت شد</h3>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                کارشناس محصول ما در نخستین فرصت کاری با شما تماس خواهد گرفت. سپاس از اعتماد شما.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate>
              <h3 className="text-lg font-extrabold">فرم درخواست مشاوره</h3>
              <input type="hidden" name="campaign" value={HIDDEN_FIELDS.campaign} />
              <input type="hidden" name="source" value={HIDDEN_FIELDS.source} />
              <input type="hidden" name="medium" value={HIDDEN_FIELDS.medium} />
              <input type="hidden" name="product" value={HIDDEN_FIELDS.product} />
              <input type="hidden" name="company" value={HIDDEN_FIELDS.company} />

              <div className="mt-5 space-y-4">
                <div>
                  <label htmlFor="fullName" className="mb-2 block text-sm font-semibold">
                    نام و نام خانوادگی
                  </label>
                  <input
                    id="fullName"
                    name="fullName"
                    required
                    autoComplete="name"
                    placeholder="مثال: دکتر مریم احمدی"
                    className="h-13 w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/15"
                  />
                </div>
                <div>
                  <label htmlFor="labName" className="mb-2 block text-sm font-semibold">
                    نام آزمایشگاه
                  </label>
                  <input
                    id="labName"
                    name="labName"
                    required
                    placeholder="مثال: آزمایشگاه پاتوبیولوژی مهر"
                    className="h-13 w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/15"
                  />
                </div>
                <div>
                  <label htmlFor="mobile" className="mb-2 block text-sm font-semibold">
                    شماره موبایل
                  </label>
                  <input
                    id="mobile"
                    name="mobile"
                    required
                    inputMode="tel"
                    autoComplete="tel"
                    dir="ltr"
                    placeholder="09123456789"
                    className="h-13 w-full rounded-2xl border border-input bg-background px-4 py-3 text-left text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/15"
                  />
                </div>
              </div>

              {error && <p className="mt-3 text-sm font-medium text-destructive">{error}</p>}

              <button
                type="submit"
                disabled={status === "loading"}
                className="mt-6 inline-flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-brand text-base font-bold text-primary-foreground shadow-glow transition-transform hover:-translate-y-0.5 disabled:opacity-70"
              >
                {status === "loading" && <Loader2 className="h-5 w-5 animate-spin" />}
                درخواست مشاوره رایگان
              </button>

              <p className="mt-4 flex items-start gap-2 text-xs leading-6 text-muted-foreground">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-ember" />
                اطلاعات شما محرمانه است و تنها برای تماس کارشناس فروش استفاده می‌شود.
              </p>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}