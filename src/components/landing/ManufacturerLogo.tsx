import { assetPath } from "@/lib/site-path";
import type { Product } from "./products";

export function ManufacturerLogo({
  manufacturer,
  eager = false,
}: {
  manufacturer: Product["manufacturer"];
  eager?: boolean;
}) {
  if (manufacturer === "Getein") {
    return (
      <span className="manufacturer-logo getein-mark">
        <img
          src={assetPath("/product-assets/getein/branding/getein-logo.png")}
          alt="Getein"
          width={400}
          height={59}
          loading={eager ? "eager" : "lazy"}
        />
      </span>
    );
  }
  return (
    <img
      className="manufacturer-logo"
      src={assetPath("/product-assets/wondfo/branding/wondfo-logo.png")}
      alt="Wondfo"
      width={160}
      height={55}
      loading={eager ? "eager" : "lazy"}
    />
  );
}
