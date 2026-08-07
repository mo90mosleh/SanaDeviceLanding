import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Icon } from "./Icon";
import { painPoints, features, steps, trustItems, faqs } from "./data";
import labImg from "@/assets/lab.jpg";
import featureImg from "@/assets/bha3000-feature.jpg.asset.json";
import engineerImg from "@/assets/engineer.jpg";
import logo from "@/assets/ortanes-logo.png";
import { AlertTriangle, Gift, ArrowLeft, Phone, MapPin, Mail, Clock, Globe } from "lucide-react";

function SectionHead({
  eyebrow,
  title,
  text,
}: {
  eyebrow: string;
  title: string;
  text?: string;
}) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      <span className="inline-block rounded-full bg-secondary px-4 py-1.5 text-xs font-bold text-primary sm:text-sm">
        {eyebrow}
      </span>
      <h2 className="mt-5 text-2xl font-extrabold leading-relaxed sm:text-3xl lg:text-4xl lg:leading-snug">
        {title}
      </h2>
      {text && <p className="mt-4 text-base leading-8 text-muted-foreground">{text}</p>}
    </div>
  );
}

export function PainPoints() {
  return (
    <section id="pain" className="scroll-mt-20 bg-background py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-5">
        <SectionHead
          eyebrow="تشخیص وضعیت"
          title="چرا باید دستگاه‌های قدیمی را کنار گذاشت؟"
          text="نگه داشتن یک سل کانتر فرسوده، ارزان‌تر از جایگزینی آن نیست؛ هزینه پنهان آن در تعمیرات، توقف کار و بی‌اعتمادی به نتایج پرداخت می‌شود."
        />

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {painPoints.map((p) => (
            <article
              key={p.title}
              className="group rounded-3xl border border-border bg-card p-6 shadow-card transition-transform hover:-translate-y-1"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
                <Icon name={p.icon} className="h-6 w-6" />
              </div>
              <h3 className="mt-5 text-lg font-bold">{p.title}</h3>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">{p.text}</p>
            </article>
          ))}
        </div>

        <div className="mt-10 flex flex-col items-start gap-4 rounded-3xl border border-border bg-secondary p-6 sm:flex-row sm:items-center">
          <AlertTriangle className="h-7 w-7 shrink-0 text-primary" />
          <p className="min-w-0 flex-1 text-sm font-semibold leading-7 sm:text-base">
            همین امروز می‌توانید دستگاه فرسوده آزمایشگاه را با GETEIN BHA3000 جایگزین کنید؛ بدون
            پرداخت بهای دستگاه.
          </p>
          <a
            href="#lead-form"
            className="inline-flex shrink-0 items-center gap-2 rounded-2xl bg-gradient-brand px-6 py-3 text-sm font-bold text-primary-foreground"
          >
            درخواست مشاوره
            <ArrowLeft className="h-4 w-4" />
          </a>
        </div>
      </div>
    </section>
  );
}

export function Features() {
  return (
    <section id="features" className="scroll-mt-20 bg-gradient-soft py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-5">
        <SectionHead
          eyebrow="معرفی محصول"
          title="چرا GETEIN BHA3000؟"
          text="هماتولوژی آنالایزر تمام‌اتوماتیک با گزارش ۲۱ پارامتر، طراحی شده برای دقت بالا، مصرف اقتصادی و کارکرد بی‌وقفه در آزمایشگاه‌های پرتراکم."
        />

        <div className="mt-12 grid items-stretch gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="grid gap-4 sm:grid-cols-2">
            {features.map((f) => (
              <article
                key={f.title}
                className="flex min-w-0 gap-4 rounded-3xl border border-border bg-card p-5 shadow-card transition-transform hover:-translate-y-1"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                  <Icon name={f.icon} className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-bold leading-7">{f.title}</h3>
                  <p className="mt-2 text-sm leading-7 text-muted-foreground">{f.text}</p>
                </div>
              </article>
            ))}
          </div>

          <div className="grid h-full grid-cols-1 grid-rows-2 gap-4">
            <img
              src={screenImg}
              alt="نمایشگر لمسی و هیستوگرام‌های سلولی دستگاه هماتولوژی آنالایزر GETEIN BHA3000"
              width={1200}
              height={900}
              loading="lazy"
              className="h-full min-h-56 w-full rounded-3xl border border-border bg-white object-cover shadow-card"
            />
            <img
              src={labImg}
              alt="آزمایشگاه مدرن تشخیص طبی مجهز به تجهیزات پیشرفته"
              width={1400}
              height={900}
              loading="lazy"
              className="h-full min-h-56 w-full rounded-3xl border border-border object-cover shadow-card"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

export function Offer() {
  return (
    <section id="offer" className="scroll-mt-20 bg-background py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-5">
        <SectionHead eyebrow="طرح ویژه" title="طرح ویژه واگذاری دستگاه" />

        <div className="mt-10 rounded-4xl border border-primary/15 bg-gradient-soft p-6 shadow-card sm:p-10">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-brand text-primary-foreground">
              <Gift className="h-7 w-7" />
            </div>
            <p className="min-w-0 text-base font-semibold leading-9 sm:text-lg sm:leading-10">
              در این طرح، آزمایشگاه می‌تواند دستگاه GETEIN BHA3000 را دریافت کند و معادل ارزش
              دستگاه، اعتبار خرید لوازم مصرفی آزمایشگاه دریافت نماید. هیچ هزینه‌ای برای بهای دستگاه
              پرداخت نمی‌کنید و شرایط به‌صورت کامل در قرارداد همکاری شفاف درج می‌شود.
            </p>
          </div>

          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((s, i) => (
              <article key={s.title} className="relative rounded-3xl border border-border bg-card p-6">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-brand text-sm font-extrabold text-primary-foreground">
                  {i + 1}
                </span>
                <h3 className="mt-4 text-base font-bold leading-7">{s.title}</h3>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">{s.text}</p>
              </article>
            ))}
          </div>

          <a
            href="#lead-form"
            className="mt-10 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-brand px-8 py-4 text-base font-bold text-primary-foreground shadow-glow transition-transform hover:-translate-y-0.5 sm:w-auto"
          >
            بررسی شرایط طرح برای آزمایشگاه من
            <ArrowLeft className="h-5 w-5" />
          </a>
        </div>
      </div>
    </section>
  );
}

export function WhyUs() {
  return (
    <section id="why-us" className="scroll-mt-20 bg-gradient-soft py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-5">
        <SectionHead
          eyebrow="اعتماد و پشتیبانی"
          title="چرا سانا شفابخش راسپینا؟"
          text="تامین تجهیزات، تنها آغاز همکاری است؛ ماندگاری آزمایشگاه شما به خدمات پس از فروش، قطعات و پشتیبانی فنی وابسته است."
        />

        <div className="mt-12 grid gap-8 lg:grid-cols-[340px_minmax(0,1fr)]">
          <img
            src={engineerImg}
            alt="کارشناس فنی پشتیبانی تجهیزات پزشکی در حال سرویس دستگاه آزمایشگاهی"
            width={1200}
            height={900}
            loading="lazy"
            className="h-full max-h-[420px] w-full rounded-3xl border border-border object-cover shadow-card"
          />
          <div className="grid gap-4 sm:grid-cols-2">
            {trustItems.map((t) => (
              <article
                key={t.title}
                className="flex min-w-0 gap-4 rounded-3xl border border-border bg-card p-5 shadow-card"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">
                  <Icon name={t.icon} className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-bold leading-7">{t.title}</h3>
                  <p className="mt-2 text-sm leading-7 text-muted-foreground">{t.text}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export function Faq() {
  return (
    <section id="faq" className="scroll-mt-20 bg-background py-16 sm:py-24">
      <div className="mx-auto max-w-3xl px-5">
        <SectionHead eyebrow="سوالات متداول" title="پرسش‌های رایج درباره طرح واگذاری" />
        <Accordion type="single" collapsible className="mt-10 space-y-3">
          {faqs.map((f, i) => (
            <AccordionItem
              key={f.q}
              value={`item-${i}`}
              className="rounded-3xl border border-border bg-card px-5 shadow-card"
            >
              <AccordionTrigger className="py-5 text-right text-base font-bold leading-7 hover:no-underline">
                {f.q}
              </AccordionTrigger>
              <AccordionContent className="pb-5 text-sm leading-8 text-muted-foreground">
                {f.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}

export function StickyCta() {
  return (
    <>
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 p-3 backdrop-blur md:hidden">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
          <a
            href="#lead-form"
            className="inline-flex h-13 items-center justify-center rounded-2xl bg-gradient-brand px-4 text-sm font-bold text-primary-foreground"
          >
            درخواست مشاوره رایگان
          </a>
          <a
            href="tel:+982633107"
            aria-label="تماس تلفنی با کارشناس فروش"
            className="inline-flex h-13 w-13 shrink-0 items-center justify-center rounded-2xl border border-primary/25 bg-card text-primary"
          >
            <Phone className="h-5 w-5" />
          </a>
        </div>
      </div>

      <a
        href="tel:+982633107"
        aria-label="تماس تلفنی با کارشناس فروش"
        className="fixed bottom-8 left-8 z-40 hidden h-14 w-14 items-center justify-center rounded-full bg-gradient-brand text-primary-foreground shadow-glow transition-transform hover:scale-105 md:inline-flex"
      >
        <Phone className="h-6 w-6" />
      </a>
    </>
  );
}

export function Footer() {
  return (
    <footer className="bg-brand-dark pb-24 pt-16 text-primary-foreground md:pb-16">
      <div className="mx-auto max-w-6xl px-5">
        <div className="grid gap-10 md:grid-cols-3">
          <div>
            <img
              src={logo}
              alt="سانا شفابخش راسپینا (اورتانیس)"
              width={640}
              height={200}
              loading="lazy"
              className="h-11 w-auto object-contain brightness-0 invert"
            />
            <p className="mt-4 text-sm leading-8 opacity-80">
              تامین‌کننده تجهیزات آزمایشگاهی و محصولات تشخیص پزشکی با مجوزهای رسمی، خدمات پس از فروش
              و پشتیبانی فنی تخصصی برای آزمایشگاه‌های خصوصی، درمانگاهی و بیمارستانی.
            </p>
          </div>

          <div>
            <div className="text-base font-bold">اطلاعات تماس</div>
            <ul className="mt-4 space-y-3 text-sm opacity-85">
              <li className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                استان البرز، شهرک صنعتی بهارستان، فاز سه، نبش بهار دوم
              </li>
              <li>
                <a href="tel:+982633107" className="flex items-start gap-2 hover:opacity-100">
                  <Phone className="mt-0.5 h-4 w-4 shrink-0" />
                  <span dir="ltr">۰۲۶ ۳۳۱۰۷</span>
                </a>
              </li>
              <li>
                <a href="mailto:info@ortanes.com" className="flex items-start gap-2 hover:opacity-100">
                  <Mail className="mt-0.5 h-4 w-4 shrink-0" />
                  info@ortanes.com
                </a>
              </li>
              <li>
                <a
                  href="https://ortanes.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-2 hover:opacity-100"
                >
                  <Globe className="mt-0.5 h-4 w-4 shrink-0" />
                  ortanes.com
                </a>
              </li>
              <li className="flex items-start gap-2">
                <Clock className="mt-0.5 h-4 w-4 shrink-0" />
                ساعات کاری: شنبه تا پنجشنبه، ۹ تا ۱۷
              </li>
            </ul>
          </div>

          <div>
            <div className="text-base font-bold">دسترسی سریع</div>
            <ul className="mt-4 space-y-3 text-sm opacity-85">
              <li>
                <a href="#features" className="hover:opacity-100">
                  معرفی GETEIN BHA3000
                </a>
              </li>
              <li>
                <a href="#offer" className="hover:opacity-100">
                  طرح واگذاری دستگاه
                </a>
              </li>
              <li>
                <a href="#faq" className="hover:opacity-100">
                  سوالات متداول
                </a>
              </li>
              <li>
                <a href="#lead-form" className="hover:opacity-100">
                  درخواست مشاوره
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-primary-foreground/15 pt-6 text-center text-xs opacity-70">
          © تمامی حقوق این وب‌سایت برای شرکت سانا شفابخش راسپینا محفوظ است.
        </div>
      </div>
    </footer>
  );
}