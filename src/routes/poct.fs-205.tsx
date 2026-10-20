import { createFileRoute } from "@tanstack/react-router";
import { ProductPage } from "@/components/landing/Site";
import { productById, productHead } from "@/components/landing/products";
const product = productById("fs-205")!;
export const Route = createFileRoute("/poct/fs-205")({
  head: () => productHead(product),
  component: () => <ProductPage product={product} />,
});
