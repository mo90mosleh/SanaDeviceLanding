import { assetPath } from "@/lib/site-path";
export function BrandLogo({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`brand-logo ${className}`.trim()}
      role="img"
      aria-label="SANA"
      viewBox="0 148 900 190"
      width="150"
      height="32"
      preserveAspectRatio="xMidYMid meet"
      overflow="hidden"
      focusable="false"
    >
      <image
        href={assetPath("/product-assets/branding/sana-logo.png")}
        x="0"
        y="0"
        width="900"
        height="494"
        aria-hidden="true"
      />
    </svg>
  );
}
