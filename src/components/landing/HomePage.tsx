import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { ArrowDown, ArrowLeft, Phone } from "lucide-react";
import { Header, Footer } from "./SiteChrome";
import { ProductImage } from "./ProductImage";
import { products } from "./products";
import type { Product } from "./products";

type Family = Product["category"];
const families: readonly Family[] = ["CBC", "POCT"];
const heroCbc = products.find((product) => product.id === "bha5100")!;
const heroPoct = products.find((product) => product.id === "fs-205")!;

function ProductCard({ product }: { product: Product }) {
  return (
    <article className="product-card" data-family={product.category.toLowerCase()}>
      <a className="product-visual" href={product.route} aria-label={`مشاهده ${product.name}`}>
        <ProductImage product={product} width={360} height={280} loading="lazy" />
      </a>
      <div className="card-content">
        <span className="card-type">
          <bdi>{product.category}</bdi>
          <span>{product.category === "CBC" ? "هماتولوژی" : "تشخیص سریع"}</span>
        </span>
        <h3 className="card-model"><bdi>{product.model}</bdi></h3>
        <p className="card-summary">{product.headline}</p>
        <ul className="card-features" aria-label="ویژگی‌های شاخص">
          {product.highlights.slice(0, 2).map((feature) => <li key={feature}>{feature}</li>)}
        </ul>
        <a className="card-link" href={product.route}>
          <span className="button-label">مشخصات و بررسی دستگاه</span>
          <ArrowLeft className="cta-icon" size={20} strokeWidth={2} aria-hidden="true" />
        </a>
      </div>
    </article>
  );
}

function ProductBrowser() {
  const [selected, setSelected] = useState<Family>("CBC");
  const tabRefs = useRef<Record<Family, HTMLButtonElement | null>>({ CBC: null, POCT: null });

  useEffect(() => {
    const followHash = () => {
      const hash = window.location.hash.toLowerCase();
      if (hash !== "#cbc" && hash !== "#poct") return;
      setSelected(hash === "#poct" ? "POCT" : "CBC");
      requestAnimationFrame(() => document.getElementById("devices")?.scrollIntoView({ block: "start", behavior: "instant" }));
    };
    followHash();
    window.addEventListener("hashchange", followHash);
    return () => window.removeEventListener("hashchange", followHash);
  }, []);

  function selectFamily(family: Family, focus = false) {
    setSelected(family);
    const url = `${window.location.pathname}${window.location.search}#${family.toLowerCase()}`;
    window.history.replaceState(window.history.state, "", url);
    if (focus) tabRefs.current[family]?.focus();
  }

  function handleKey(event: KeyboardEvent<HTMLButtonElement>, family: Family) {
    const index = families.indexOf(family);
    let next: Family;
    if (event.key === "ArrowLeft") next = families[(index + 1) % families.length]!;
    else if (event.key === "ArrowRight") next = families[(index - 1 + families.length) % families.length]!;
    else if (event.key === "Home") next = "CBC";
    else if (event.key === "End") next = "POCT";
    else return;
    event.preventDefault();
    selectFamily(next, true);
  }

  return (
    <section className="product-browser" id="devices" aria-labelledby="devices-heading">
      <div className="browser-heading">
        <div>
          <span className="eyebrow">راهکار مناسب آزمایشگاه شما</span>
          <h2 id="devices-heading">دستگاه‌های سانا را بشناسید.</h2>
        </div>
        <p>دو خانوادهٔ محصول، یک مسیر روشن برای انتخاب.</p>
      </div>
      <div className="family-tabs" role="tablist" aria-label="خانوادهٔ دستگاه‌ها" aria-orientation="horizontal">
        {families.map((family) => (
          <button
            key={family}
            id={`family-tab-${family.toLowerCase()}`}
            type="button"
            role="tab"
            aria-selected={selected === family}
            aria-controls={family.toLowerCase()}
            tabIndex={selected === family ? 0 : -1}
            ref={(node) => { tabRefs.current[family] = node; }}
            onClick={() => selectFamily(family)}
            onKeyDown={(event) => handleKey(event, family)}
          >
            <bdi>{family}</bdi>
            <span>{family === "CBC" ? "هماتولوژی" : "تشخیص سریع"}</span>
          </button>
        ))}
      </div>
      {families.map((family) => {
        const items = products.filter((product) => product.category === family);
        const isCbc = family === "CBC";
        return (
          <section
            key={family}
            id={family.toLowerCase()}
            className="family-panel"
            data-family={family.toLowerCase()}
            role="tabpanel"
            aria-labelledby={`family-tab-${family.toLowerCase()}`}
            hidden={selected !== family}
            tabIndex={0}
          >
            <div className="family-heading">
              <div className="family-copy">
                <h3>
                  {isCbc ? (
                    <>آنالایزرهای هماتولوژی <bdi>Getein</bdi></>
                  ) : (
                    <>آنالایزرهای <bdi>Finecare</bdi> از <bdi>Wondfo</bdi></>
                  )}
                </h3>
                <p>{isCbc ? "سه انتخاب برای بخش شمارش خون." : "دو راهکار ایمونوفلورسانس، متناسب با گردش کار مرکز شما."}</p>
              </div>
              <div className="family-brand">
                {isCbc ? (
                  <span className="manufacturer-logo getein-mark">
                    <img src="/product-assets/getein/branding/getein-logo.png" alt="Getein" width={400} height={59} loading="lazy" />
                  </span>
                ) : (
                  <img className="manufacturer-logo" src="/product-assets/wondfo/branding/wondfo-logo.png" alt="Wondfo" width={160} height={55} loading="lazy" />
                )}
                <span className="family-count">{isCbc ? "۳ دستگاه" : "۲ دستگاه"}</span>
              </div>
            </div>
            <div className={`product-grid ${isCbc ? "three" : "two"}`}>
              {items.map((product) => <ProductCard key={product.id} product={product} />)}
            </div>
          </section>
        );
      })}
    </section>
  );
}

export function Home() {
  return (
    <>
      <Header />
      <main id="main" className="home-page">
        <section className="home-hero" aria-labelledby="home-heading">
          <div className="hero-copy">
            <span className="eyebrow exhibition-note"><i aria-hidden="true" /> ویژه معرفی در نمایشگاه آزمایشگاهی</span>
            <h1 id="home-heading">نسل جدید راهکارهای <span>تشخیص آزمایشگاهی</span></h1>
            <p>دستگاه‌های <bdi>CBC</bdi> و <bdi>POCT</bdi> سانا را بررسی کنید و متناسب با نیاز آزمایشگاه خود انتخاب کنید.</p>
            <div className="hero-actions">
              <a className="button primary" href="#devices">
                <span className="button-label">انتخاب و بررسی دستگاه‌ها</span>
                <ArrowDown className="cta-icon" size={20} strokeWidth={2} aria-hidden="true" />
              </a>
              <a className="text-link hero-contact" href="tel:+982633107">
                <span>مشاوره انتخاب</span>
                <Phone className="cta-icon" size={20} strokeWidth={2} aria-hidden="true" />
              </a>
            </div>
          </div>
          <div className="hero-composition" aria-label="دستگاه‌های CBC و POCT سانا">
            <div className="hero-device hero-device-cbc">
              <span className="hero-family-label"><bdi>CBC</bdi><span>هماتولوژی</span></span>
              <ProductImage product={heroCbc} width={360} height={320} fetchPriority="high" />
            </div>
            <div className="hero-device hero-device-poct">
              <span className="hero-family-label"><bdi>POCT</bdi><span>ایمونوفلورسانس</span></span>
              <ProductImage product={heroPoct} width={320} height={300} fetchPriority="high" />
            </div>
          </div>
        </section>
        <ProductBrowser />
        <section className="help-banner home-consultation">
          <div>
            <span className="eyebrow">یک قدم نزدیک‌تر به انتخاب</span>
            <h2>برای انتخاب دستگاه همراهتان هستیم.</h2>
            <p>نیاز آزمایشگاه خود را با کارشناسان سانا مطرح کنید.</p>
          </div>
          <a href="tel:+982633107" className="button primary">
            <span className="button-label">گفت‌وگو با کارشناس</span>
            <Phone className="cta-icon" size={20} strokeWidth={2} aria-hidden="true" />
          </a>
        </section>
      </main>
      <Footer />
    </>
  );
}
