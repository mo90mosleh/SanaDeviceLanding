import { useEffect } from "react";
import { ArrowDown, ArrowLeft, Download, Phone } from "lucide-react";
import { readAttribution } from "@/lib/attribution";
import { products } from "./products";
import type { Product } from "./products";
import { Consultation } from "./Consultation";
import { ProductSlideshow } from "./ProductSlideshow";
import { ProductImage } from "./ProductImage";
import { ProductHighlights } from "./ProductHighlights";
const assets = "/product-assets";
export function Header() {
  useEffect(() => {
    readAttribution();
  }, []);
  return (
    <>
      <a className="skip-link" href="#main">
        رفتن به محتوای اصلی
      </a>
      <div className="top-line">
        <span>تجهیزات تشخیص آزمایشگاهی</span>
        <span dir="ltr">SANA · MEDICAL DEVICES</span>
      </div>
      <header className="site-header">
        <a href="/" className="brand" aria-label="SANA، صفحه اصلی">
          <img src={`${assets}/branding/sana-logo.png`} alt="SANA" width="180" height="35" />
          <span>سانا شفابخش راسپینا</span>
        </a>
        <nav aria-label="ناوبری اصلی">
          <a href="/#cbc">آنالایزرهای CBC</a>
          <a href="/#poct">تشخیص سریع POCT</a>
        </nav>
        <a className="header-contact" href="tel:+982633107">
          <span>مشاوره انتخاب دستگاه</span>
          <bdi>۰۲۶ ۳۳۱۰۷</bdi>
          <Phone className="cta-icon" size={20} strokeWidth={2} aria-hidden="true" />
        </a>
      </header>
    </>
  );
}
export function Footer() {
  return (
    <footer>
      <div className="footer-grid">
        <div>
          <img
            className="footer-logo"
            src={`${assets}/branding/sana-logo.png`}
            alt="SANA"
            width="170"
            height="33"
          />
          <p>
            تجهیزات آزمایشگاهی، انتخاب آگاهانه.
            <br />
            همراه مراکز تشخیص پزشکی در انتخاب دستگاه مناسب.
          </p>
        </div>
        <div>
          <h2>دستگاه‌ها</h2>
          {products.map((p) => (
            <a key={p.id} href={p.route} dir="ltr">
              {p.name}
            </a>
          ))}
        </div>
        <div>
          <h2>در ارتباط باشیم</h2>
          <a href="tel:+982633107" dir="ltr">
            ۰۲۶ ۳۳۱۰۷
          </a>
          <p>البرز، شهرک صنعتی بهارستان، فاز سه، نبش بهار دوم</p>
        </div>
      </div>
      <div className="footer-bottom">
        <span>تمامی حقوق برای SANA محفوظ است.</span>
        <span dir="ltr">DIAGNOSTICS, WITH CLARITY.</span>
      </div>
    </footer>
  );
}
function Category({ category }: { category: "CBC" | "POCT" }) {
  const isCbc = category === "CBC";
  return (
    <section id={category.toLowerCase()} className={`category ${isCbc ? "cbc" : "poct"}`}>
      <div className="section-heading">
        <div>
          <span className="eyebrow">{isCbc ? "۱ / هماتولوژی" : "۲ / ایمونوفلورسانس"}</span>
          <h2>{isCbc ? "دستگاه‌های آنالیز خون CBC" : "دستگاه‌های تشخیص سریع POCT"}</h2>
          <p>
            {isCbc
              ? "سه انتخاب برای گردش کار بخش شمارش خون."
              : "دو راهکار Finecare، متناسب با محل استفاده و حجم آزمون‌ها."}
          </p>
        </div>
        {isCbc ? (
          <span className="manufacturer-logo getein-mark">
            <img
              src={`${assets}/getein/branding/getein-logo.png`}
              alt="Getein"
              width="400"
              height="59"
              loading="lazy"
            />
          </span>
        ) : (
          <img
            className="manufacturer-logo"
            src={`${assets}/${isCbc ? "getein/branding/getein-logo.png" : "wondfo/branding/wondfo-logo.png"}`}
            alt={isCbc ? "Getein" : "Wondfo"}
            width="160"
            height="55"
            loading="lazy"
          />
        )}
      </div>
      <div className={`product-grid ${isCbc ? "three" : "two"}`}>
        {products
          .filter((p) => p.category === category)
          .map((p, i) => (
            <article className="product-card" key={p.id}>
              <div className="card-top">
                <span>{isCbc ? "HEMATOLOGY" : "FLUORESCENCE IMMUNOASSAY"}</span>
                <span>
                  {String(i + 1)
                    .replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]!)}
                </span>
              </div>
              <a className="product-visual" href={p.route} aria-label={`مشاهده ${p.name}`}>
                <ProductImage
                  product={p}
                  width="440"
                  height="340"
                  loading="lazy"
                />
              </a>
              <div className="card-content">
                <span className="card-type">
                  {isCbc
                    ? "آنالایزر هماتولوژی"
                    : p.id === "fs-114"
                      ? "FIA Meter II Plus SE"
                      : "FIA Meter III Plus"}
                </span>
                <h3 dir="ltr">{p.name}</h3>
                <p>{p.headline}</p>
                <ul className="card-features">
                  {p.highlights.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
                <a className="card-link" href={p.route}>
                  <span className="button-label">مشاهده مشخصات دستگاه</span>
                  <ArrowLeft className="cta-icon" size={20} strokeWidth={2} aria-hidden="true" />
                </a>
              </div>
            </article>
          ))}
      </div>
    </section>
  );
}
export function Home() {
  return (
    <>
      <Header />
      <main id="main">
        <section className="home-hero">
          <div className="hero-copy">
            <span className="eyebrow">
              <i /> انتخابی روشن برای آزمایشگاه شما
            </span>
            <h1>
              دقت در تشخیص،
              <br />
              <em>اطمینان در انتخاب.</em>
            </h1>
            <p>
              از شمارش سلول‌های خون تا آزمون‌های تخصصی؛
              <br />
              دستگاه متناسب با نیاز مرکز خود را در SANA پیدا کنید.
            </p>
            <a className="button primary" href="#cbc">
              <span className="button-label">انتخاب و بررسی دستگاه‌ها</span>
              <ArrowDown className="cta-icon" size={20} strokeWidth={2} aria-hidden="true" />
            </a>
            <div className="hero-caption">
              <span>۵ دستگاه تخصصی</span>
              <span>۲ برند سازنده</span>
              <span>یک مسیر برای انتخاب آگاهانه</span>
            </div>
          </div>
          <ProductSlideshow />
        </section>
        <Category category="CBC" />
        <Category category="POCT" />
        <section className="help-banner">
          <div>
            <span className="eyebrow">از انتخاب تا تصمیم</span>
            <h2>کدام دستگاه برای مرکز شما مناسب‌تر است؟</h2>
            <p>نوع آزمون، حجم نمونه روزانه و فضای کار را با کارشناسان مطرح کنید.</p>
          </div>
          <a href="tel:+982633107" className="button light">
            <span className="button-label">گفت‌وگو با کارشناس</span>
            <Phone className="cta-icon" size={20} strokeWidth={2} aria-hidden="true" />
          </a>
        </section>
      </main>
      <Footer />
    </>
  );
}
export function ProductPage({ product: p }: { product: Product }) {
  return (
    <>
      <Header />
      <main id="main">
        <div className="breadcrumbs">
          <a href="/">همه دستگاه‌ها</a>
          <span>/</span>
          <a href={`/#${p.category.toLowerCase()}`}>{p.category}</a>
          <span>/</span>
          <bdi>{p.model}</bdi>
        </div>
        <section className="device-hero">
          <div className="device-copy">
            <span className="eyebrow">
              {p.manufacturer.toUpperCase()} / {p.category}
            </span>
            <p className="model-name" dir="ltr">
              {p.name}
            </p>
            <h1>{p.headline}</h1>
            <p>{p.description}</p>
            <div className="hero-actions">
              <a className="button primary" href="#consultation">
                <span className="button-label">
                  {p.id === "bha3000" ? "دریافت مشاوره و شرایط خرید" : "دریافت مشاوره خرید"}
                </span>
                <ArrowLeft className="cta-icon" size={20} strokeWidth={2} aria-hidden="true" />
              </a>
              <a className="text-link" href="#specs">
                <span className="button-label">مشاهده مشخصات فنی</span>
                <ArrowDown className="cta-icon" size={20} strokeWidth={2} aria-hidden="true" />
              </a>
            </div>
          </div>
          <div className="device-photo">
            <ProductImage
              product={p}
              width="650"
              height="490"
              fetchPriority="high"
            />
            <span>
              {p.manufacturer} / {p.model}
            </span>
          </div>
        </section>
        <ProductHighlights product={p} />
        <nav className="section-nav" aria-label="بخش‌های صفحه دستگاه">
          <a href="#advantages">مزیت‌ها</a>
          <a href="#specs">مشخصات فنی</a>
          <a href="#applications">کاربردها</a>
          <a href="#workflow">روش کار</a>
        </nav>
        <section className="detail-section" id="advantages">
          <span className="eyebrow">طراحی برای کار روزانه</span>
          <h2>قابلیت‌های فنی، در خدمت گردش کار شما</h2>
          <div className="advantages-grid">
            {p.advantages.map((a, i) => (
              <article key={a.title}>
                <span className="advantage-number">
                  {String(i + 1)
                    .replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]!)}
                </span>
                <h3>{a.title}</h3>
                <p>{a.text}</p>
              </article>
            ))}
          </div>
        </section>
        <section className="spec-section" id="specs" aria-labelledby="specs-heading">
          <div className="spec-intro">
            <span className="eyebrow">شناخت دقیق‌تر</span>
            <h2 id="specs-heading">
              مشخصات فنی <bdi className="spec-model">{p.model}</bdi>
            </h2>
            <p>
              بر اساس کاتالوگ اختصاصی همین مدل.
              <br />
              پیکربندی نسخه پیشنهادی را هنگام خرید تأیید کنید.
            </p>
            <a href={p.catalog} className="text-link" download>
              <span className="button-label">دریافت کاتالوگ اصلی</span>
              <Download className="cta-icon" size={20} strokeWidth={2} aria-hidden="true" />
            </a>
          </div>
          <div className="spec-table-wrap">
            <table className="spec-table" aria-labelledby="specs-heading">
              <thead>
                <tr>
                  <th scope="col">مشخصه</th>
                  <th scope="col">جزئیات فنی</th>
                </tr>
              </thead>
              <tbody>
                {p.specs.map(([key, value]) => (
                  <tr key={key}>
                    <th scope="row">{key}</th>
                    <td>
                      <bdi dir="auto">{value}</bdi>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <section className="detail-section" id="applications">
          <span className="eyebrow">زمینه‌های کاربرد</span>
          <h2>
            {p.category === "CBC"
              ? "برای بخش هماتولوژی آزمایشگاه"
              : "منوی آزمون‌های معرفی‌شده در کاتالوگ"}
          </h2>
          <div className="applications-grid">
            {p.applications.map((a) => (
              <article key={a.title}>
                <span aria-hidden="true">＋</span>
                <h3>{a.title}</h3>
                <p>{a.text}</p>
              </article>
            ))}
          </div>
          <p className="source-note">
            {p.category === "POCT"
              ? "سازگاری برای کد دقیق کیت و نسخه دستگاه باید تأیید شود. نوع نمونه، حجم و زمان واکنش هر آزمون تابع دستورالعمل همان کیت است."
              : "تفسیر نتایج و بررسی هشدارها بر عهده متخصص آزمایشگاه است؛ آماده‌سازی و کنترل کیفیت مطابق راهنمای دستگاه انجام شود."}
          </p>
        </section>
        <section className="detail-section workflow-section" id="workflow">
          <span className="eyebrow">از نمونه تا نتیجه</span>
          <h2>گردش کار دستگاه</h2>
          <ol className="workflow">
            {p.workflow.map((s, i) => (
              <li key={s}>
                <span>
                  {String(i + 1)
                    .replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]!)}
                </span>
                <p>{s}</p>
              </li>
            ))}
          </ol>
        </section>
        <section className="catalog-banner" id="catalog">
          <div>
            <span className="eyebrow">مستندات محصول</span>
            <h2>جزئیات را از منبع اصلی بخوانید.</h2>
            <p>
              کاتالوگ اختصاصی <bdi>{p.name}</bdi> · PDF
            </p>
          </div>
          <a className="button primary" href={p.catalog} download>
            <span className="button-label">دانلود کاتالوگ دستگاه</span>
            <Download className="cta-icon" size={20} strokeWidth={2} aria-hidden="true" />
          </a>
        </section>
        <section className="detail-section faq-section" id="faq">
          <div>
            <span className="eyebrow">پیش از انتخاب</span>
            <h2>پرسش‌های متداول</h2>
            <p>
              درباره <bdi>{p.model}</bdi> بیشتر بدانید.
            </p>
          </div>
          <div>
            {p.faqs.map((f) => (
              <details key={f.q}>
                <summary>
                  {f.q}
                  <span aria-hidden="true">＋</span>
                </summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </section>
        <Consultation key={p.id} product={p} />
      </main>
      <Footer />
      <div className="mobile-cta">
        <a href="#consultation" className="button primary">
          <span className="button-label">مشاوره خرید <bdi>{p.model}</bdi></span>
          <ArrowLeft className="cta-icon" size={20} strokeWidth={2} aria-hidden="true" />
        </a>
        <a href="tel:+982633107" className="mobile-phone">
          <Phone className="cta-icon" size={20} strokeWidth={2} aria-hidden="true" />
          <span>تماس</span>
        </a>
      </div>
    </>
  );
}

