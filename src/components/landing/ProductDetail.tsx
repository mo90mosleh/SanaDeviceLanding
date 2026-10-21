import { ArrowDown, ArrowLeft, Download, Phone, Plus } from "lucide-react";
import type { Product } from "./products";
import { Header, Footer } from "./SiteChrome";
import { Consultation } from "./Consultation";
import { ProductImage } from "./ProductImage";
import { ProductHighlights } from "./ProductHighlights";

export function ProductPage({ product: p }: { product: Product }) {
  return (
    <>
      <Header />
      <main
        id="main"
        className="product-detail"
        data-family={p.category.toLowerCase()}
        data-product={p.id}
      >
        <nav className="breadcrumbs" aria-label="مسیر صفحه">
          <a href="/">همه دستگاه‌ها</a>
          <span aria-hidden="true">/</span>
          <a href={`/#${p.category.toLowerCase()}`}>{p.category}</a>
          <span aria-hidden="true">/</span>
          <bdi aria-current="page">{p.model}</bdi>
        </nav>
        <section className="device-hero">
          <div className="device-copy">
            <div className="device-meta">
              <span className="device-category">{p.category}</span>
              <span className="device-manufacturer" dir="ltr">
                {p.manufacturer.toUpperCase()}
              </span>
            </div>
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
            <ProductImage product={p} width="650" height="490" fetchPriority="high" />
            <div className="device-media-caption" dir="ltr">
              <span>{p.manufacturer}</span>
              <span aria-hidden="true">/</span>
              <bdi>{p.model}</bdi>
            </div>
          </div>
        </section>
        <ProductHighlights product={p} />
        <nav className="section-nav" aria-label="بخش‌های صفحه دستگاه">
          <a href="#advantages">مزیت‌ها</a>
          <a href="#specs">مشخصات فنی</a>
          <a href="#applications">کاربردها</a>
          <a href="#workflow">روش کار</a>
        </nav>
        <section className="detail-section" id="advantages" aria-labelledby="advantages-heading">
          <div className="detail-heading">
            <span className="eyebrow">طراحی برای کار روزانه</span>
            <h2 id="advantages-heading">قابلیت‌های فنی، در خدمت گردش کار شما</h2>
          </div>
          <div className="advantages-grid">
            {p.advantages.map((a, i) => (
              <article key={a.title}>
                <span className="advantage-number">
                  {String(i + 1).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]!)}
                </span>
                <h3>{a.title}</h3>
                <p>{a.text}</p>
              </article>
            ))}
          </div>
        </section>
        <section className="spec-section" id="specs" aria-labelledby="specs-heading">
          <div className="spec-intro">
            <div className="detail-heading spec-intro-copy">
              <span className="eyebrow">شناخت دقیق‌تر</span>
              <h2 id="specs-heading">
                مشخصات فنی <bdi className="spec-model">{p.model}</bdi>
              </h2>
              <p>
                بر اساس کاتالوگ اختصاصی همین مدل.
                <br />
                پیکربندی نسخه پیشنهادی را هنگام خرید تأیید کنید.
              </p>
            </div>
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
        <section
          className="detail-section"
          id="applications"
          aria-labelledby="applications-heading"
        >
          <div className="detail-heading">
            <span className="eyebrow">زمینه‌های کاربرد</span>
            <h2 id="applications-heading">
              {p.category === "CBC"
                ? "برای بخش هماتولوژی آزمایشگاه"
                : "منوی آزمون‌های معرفی‌شده در کاتالوگ"}
            </h2>
          </div>
          <div className="applications-grid">
            {p.applications.map((a) => (
              <article key={a.title}>
                <span className="application-icon" aria-hidden="true">
                  <Plus size={20} strokeWidth={1.8} focusable="false" />
                </span>
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
        <section
          className="detail-section workflow-section"
          id="workflow"
          aria-labelledby="workflow-heading"
        >
          <div className="detail-heading">
            <span className="eyebrow">از نمونه تا نتیجه</span>
            <h2 id="workflow-heading">گردش کار دستگاه</h2>
          </div>
          <ol className="workflow">
            {p.workflow.map((s, i) => (
              <li key={s}>
                <span>{String(i + 1).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]!)}</span>
                <p>{s}</p>
              </li>
            ))}
          </ol>
        </section>
        <section className="catalog-banner" id="catalog" aria-labelledby="catalog-heading">
          <div className="catalog-copy">
            <span className="eyebrow">مستندات محصول</span>
            <h2 id="catalog-heading">جزئیات را از منبع اصلی بخوانید.</h2>
            <p>
              کاتالوگ اختصاصی <bdi>{p.name}</bdi> · PDF
            </p>
          </div>
          <a className="button primary" href={p.catalog} download>
            <span className="button-label">دانلود کاتالوگ دستگاه</span>
            <Download className="cta-icon" size={20} strokeWidth={2} aria-hidden="true" />
          </a>
        </section>
        <section className="detail-section faq-section" id="faq" aria-labelledby="faq-heading">
          <div className="detail-heading faq-intro">
            <span className="eyebrow">پیش از انتخاب</span>
            <h2 id="faq-heading">پرسش‌های متداول</h2>
            <p>
              درباره <bdi>{p.model}</bdi> بیشتر بدانید.
            </p>
          </div>
          <div className="faq-list">
            {p.faqs.map((f) => (
              <details className="faq-item" key={f.q}>
                <summary>
                  <span className="faq-question">{f.q}</span>
                  <Plus
                    className="faq-toggle"
                    size={20}
                    strokeWidth={1.8}
                    aria-hidden="true"
                    focusable="false"
                  />
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
          <span className="button-label">
            مشاوره خرید <bdi>{p.model}</bdi>
          </span>
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
