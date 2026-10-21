import { useEffect, useState } from "react";
import { ArrowLeft, ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { products } from "./products";

export function ProductSlideshow() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const product = products[index]!;
  const move = (step: number) =>
    setIndex((previous) => (previous + step + products.length) % products.length);

  useEffect(() => {
    if (paused || hovered || focused) return;
    const timer = window.setInterval(
      () => setIndex((previous) => (previous + 1) % products.length),
      2000,
    );
    return () => window.clearInterval(timer);
  }, [paused, hovered, focused]);

  return (
    <section
      className="hero-showcase"
      aria-label="نمایش دستگاه‌های SANA"
      aria-roledescription="اسلایدر"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);
      }}
    >
      <div className="showcase-tag">
        <span className="status-dot" /> SANA DEVICE COLLECTION <span>{product.category}</span>
      </div>
      <div className="showcase-slides" aria-live="off">
        {products.map((item, slideIndex) => (
          <div
            key={item.id}
            className={`showcase-slide ${slideIndex === index ? "is-active" : ""}`}
            aria-hidden={slideIndex !== index}
          >
            <img
              src={item.image}
              alt={`دستگاه ${item.name}`}
              width="620"
              height="440"
              fetchPriority={slideIndex === 0 ? "high" : "auto"}
            />
          </div>
        ))}
      </div>
      <div className="showcase-bottom">
        <div>
          <bdi>{product.name}</bdi>
          <span>
            {product.category === "CBC" ? "آنالایزر هماتولوژی" : "آنالایزر ایمونوفلورسانس"}
          </span>
        </div>
        <a
          className="showcase-details"
          href={product.route}
          aria-label={`مشاهده مشخصات ${product.name}`}
        >
          <span className="button-label">مشخصات دستگاه</span>
          <ArrowLeft className="cta-icon" size={20} strokeWidth={2} aria-hidden="true" />
        </a>
      </div>
      <div className="slideshow-controls">
        <button type="button" onClick={() => move(-1)} aria-label="دستگاه قبلی">
          <ChevronLeft size={20} strokeWidth={2} aria-hidden="true" />
        </button>
        <div className="slideshow-dots">
          {products.map((item, slideIndex) => (
            <button
              key={item.id}
              type="button"
              className={slideIndex === index ? "is-active" : ""}
              onClick={() => setIndex(slideIndex)}
              aria-label={`نمایش ${item.name}`}
              aria-current={slideIndex === index ? "true" : undefined}
            >
              <span />
            </button>
          ))}
        </div>
        <button type="button" onClick={() => move(1)} aria-label="دستگاه بعدی">
          <ChevronRight size={20} strokeWidth={2} aria-hidden="true" />
        </button>
        <button
          className="slideshow-toggle"
          type="button"
          onClick={() => setPaused(!paused)}
          aria-label={paused ? "ادامه نمایش خودکار" : "توقف نمایش خودکار"}
          aria-pressed={paused}
        >
          {paused ? (
            <Play size={16} strokeWidth={2} aria-hidden="true" />
          ) : (
            <Pause size={16} strokeWidth={2} aria-hidden="true" />
          )}
        </button>
      </div>
    </section>
  );
}

