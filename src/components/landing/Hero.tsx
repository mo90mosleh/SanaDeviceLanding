import { ShieldCheck, BadgeCheck, Headset, Truck, Phone, ArrowLeft } from "lucide-react";
import device from "@/assets/bha3000.jpg";

const badges = [
  { icon: ShieldCheck, label: "مجوز رسمی IRC" },
  { icon: BadgeCheck, label: "گارانتی رسمی شرکت" },
  { icon: Headset, label: "پشتیبانی فنی تخصصی" },
  { icon: Truck, label: "تامین مستقیم تجهیزات" },
];

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-soft pt-10 pb-16 sm:pt-16 sm:pb-24">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 -left-32 h-80 w-80 rounded-full bg-primary/10 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 -right-24 h-96 w-96 rounded-full bg-accent/60 blur-3xl"
      />
      <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-5 lg:grid-cols-2">
        <div className="animate-rise">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-card/80 px-4 py-1.5 text-xs font-semibold text-primary sm:text-sm">
            <span className="h-2 w-2 rounded-full bg-teal" />
            طرح ویژه پیش از نمایشگاه ایران هلث — ظرفیت محدود
          </span>

          <h1 className="mt-6 text-3xl font-extrabold leading-[1.35] tracking-tight sm:text-4xl lg:text-5xl lg:leading-[1.3]">
            واگذاری رایگان دستگاه سل کانتر
            <span className="mt-2 block bg-gradient-brand bg-clip-text text-transparent">
              GETEIN BHA3000
            </span>
          </h1>

          <p className="mt-5 max-w-xl text-base leading-8 text-muted-foreground sm:text-lg sm:leading-9">
            آزمایشگاه شما دستگاه هماتولوژی آنالایزر تمام‌اتوماتیک GETEIN BHA3000 را دریافت می‌کند و
            معادل ارزش دستگاه، اعتبار خرید لوازم مصرفی آزمایشگاه در اختیار شما قرار می‌گیرد. بدون
            پیچیدگی قیمتی و با شرایط کاملاً شفاف.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a
              href="#lead-form"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-brand px-7 py-4 text-base font-bold text-primary-foreground shadow-glow transition-transform hover:-translate-y-0.5"
            >
              درخواست مشاوره
              <ArrowLeft className="h-5 w-5" />
            </a>
            <a
              href="tel:02100000000"
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-primary/25 bg-card px-7 py-4 text-base font-bold text-primary transition-colors hover:bg-secondary"
            >
              <Phone className="h-5 w-5" />
              تماس با کارشناس فروش
            </a>
          </div>

          <ul className="mt-9 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {badges.map((b) => (
              <li
                key={b.label}
                className="flex min-w-0 flex-col items-center gap-2 rounded-2xl border border-border bg-card/80 px-3 py-4 text-center shadow-card"
              >
                <b.icon className="h-6 w-6 shrink-0 text-teal" />
                <span className="text-xs font-semibold leading-5">{b.label}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="animate-rise">
          <div className="relative rounded-4xl border border-border bg-card p-6 shadow-card sm:p-10">
            <img
              src={device}
              alt="دستگاه سل کانتر تمام‌اتوماتیک GETEIN BHA3000"
              width={1200}
              height={1200}
              className="mx-auto w-full max-w-md animate-float object-contain"
            />
            <div className="mt-6 grid grid-cols-3 gap-3 text-center">
              {[
                { v: "۲۱", l: "پارامتر گزارش" },
                { v: "۳", l: "هیستوگرام سلولی" },
                { v: "کم", l: "حجم نمونه خون" },
              ].map((s) => (
                <div key={s.l} className="rounded-2xl bg-secondary px-2 py-3">
                  <div className="text-lg font-extrabold text-primary">{s.v}</div>
                  <div className="mt-1 text-[11px] font-medium text-muted-foreground">{s.l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}