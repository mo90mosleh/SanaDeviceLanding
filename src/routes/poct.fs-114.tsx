import { createFileRoute } from "@tanstack/react-router";
import { ProductPage } from "@/components/landing/Site";
import { productById, productHead } from "@/components/landing/products";
const product = productById("fs-114")!;
export const Route = createFileRoute("/poct/fs-114")({
  head: () => productHead(product),
  component: () => <ProductPage product={product} />,
});
