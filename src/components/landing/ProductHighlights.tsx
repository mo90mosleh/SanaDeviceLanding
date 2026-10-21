import {
  BatteryCharging,
  CircleDot,
  Droplet,
  Gauge,
  Layers3,
  ListChecks,
  Monitor,
  Network,
  Printer,
  Thermometer,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Product } from "./products";

const featureIcons: Record<string, readonly LucideIcon[]> = {
  bha3000: [Layers3, ListChecks, Droplet],
  bha5000: [Layers3, Gauge, Droplet],
  bha5100: [ListChecks, Zap, Network],
  "fs-114": [Monitor, BatteryCharging, Printer],
  "fs-205": [Layers3, Thermometer, Gauge],
};

export function ProductHighlights({ product }: { product: Product }) {
  return (
    <ul className="key-features" aria-label={`ویژگی‌های کلیدی ${product.model}`}>
      {product.highlights.map((feature, index) => {
        const Icon = featureIcons[product.id]?.[index] ?? CircleDot;
        return (
          <li key={feature}>
            <span className="key-feature-icon" aria-hidden="true">
              <Icon size={22} strokeWidth={1.8} focusable="false" />
            </span>
            <span className="key-feature-text">{feature}</span>
          </li>
        );
      })}
    </ul>
  );
}
