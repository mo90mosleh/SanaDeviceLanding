import { createFileRoute } from "@tanstack/react-router";
import { ProductPage } from "@/components/landing/Site";
import { productById, productHead } from "@/components/landing/products";
const product = productById("bha5000")!;
export const Route = createFileRoute("/cbc/bha5000")({
  head: () => productHead(product),
  component: () => <ProductPage product={product} />,
});
