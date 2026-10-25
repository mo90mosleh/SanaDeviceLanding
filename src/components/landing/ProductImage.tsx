import { assetPath } from "@/lib/site-path";
import type { ImgHTMLAttributes } from "react";
import type { Product } from "./products";

type ProductImageProps = {
  product: Product;
  width: number | string;
  height: number | string;
} & Pick<ImgHTMLAttributes<HTMLImageElement>, "loading" | "fetchPriority" | "className">;

export function ProductImage({
  product,
  width,
  height,
  loading,
  fetchPriority,
  className,
}: ProductImageProps) {
  const imageClass = ["product-image", className].filter(Boolean).join(" ");
  const label = `دستگاه ${product.name}`;

  if (product.id === "bha5000" || product.id === "bha3000") {
    const isBha3000 = product.id === "bha3000";
    return (
      <svg
        className={imageClass}
        role="img"
        aria-label={label}
        focusable="false"
        width={width}
        height={height}
        viewBox={isBha3000 ? "220 240 360 365" : "330 0 1020 977"}
        preserveAspectRatio="xMidYMid meet"
        overflow="hidden"
      >
        <image
          className="original-product-image"
          href={assetPath(product.image) + (isBha3000 ? "" : "?v=blue-20261025")}
          x="0"
          y="0"
          width={isBha3000 ? "800" : "1609"}
          height={isBha3000 ? "800" : "977"}
          aria-hidden="true"
        />
      </svg>
    );
  }

  return (
    <img
      className={imageClass}
      src={assetPath(product.image)}
      alt={label}
      width={width}
      height={height}
      loading={loading}
      fetchPriority={fetchPriority}
    />
  );
}
