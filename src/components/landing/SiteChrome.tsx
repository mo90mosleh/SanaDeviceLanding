import { useEffect } from "react";
import { Phone } from "lucide-react";
import { readAttribution } from "@/lib/attribution";
import { products } from "./products";
import { BrandLogo } from "./BrandLogo";

export function Header() {
  useEffect(() => {
    readAttribution();
  }, []);

  return (
    <>
      <a className="skip-link" href="#main">
        رفتن به محتوای اصلی
      </a>
      <header className="site-header">
        <a href="/" className="brand" aria-label="SANA، صفحه اصلی">
          <BrandLogo />
          <span className="brand-name">سانا شفابخش راسپینا</span>
        </a>
        <nav className="header-families" aria-label="خانواده‌های محصول">
          <a href="/#cbc" aria-label="دستگاه‌های هماتولوژی CBC">
            <span>هماتولوژی</span>
            <bdi>CBC</bdi>
          </a>
          <a href="/#poct" aria-label="دستگاه‌های تشخیص سریع POCT">
            <span>تشخیص سریع</span>
            <bdi>POCT</bdi>
          </a>
        </nav>
        <a
          className="header-contact"
          href="tel:+982633107"
          aria-label="تماس با کارشناسان سانا، ۰۲۶ ۳۳۱۰۷"
        >
          <Phone className="cta-icon" size={20} aria-hidden="true" />
          <bdi>۰۲۶ ۳۳۱۰۷</bdi>
        </a>
      </header>
    </>
  );
}

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-grid">
        <div className="footer-brand">
          <a href="/" aria-label="SANA، صفحه اصلی">
            <BrandLogo />
          </a>
          <p>راهکارهای تشخیص آزمایشگاهی، برای انتخابی آگاهانه.</p>
        </div>
        <div className="footer-products">
          <h2>دستگاه‌های سانا</h2>
          <div className="footer-product-links">
            {products.map((product) => (
              <a key={product.id} href={product.route}>
                <bdi>{product.model}</bdi>
              </a>
            ))}
          </div>
        </div>
        <div className="footer-contact">
          <h2>در ارتباط باشیم</h2>
          <a className="footer-phone" href="tel:+982633107">
            <Phone size={16} aria-hidden="true" />
            <bdi>۰۲۶ ۳۳۱۰۷</bdi>
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
