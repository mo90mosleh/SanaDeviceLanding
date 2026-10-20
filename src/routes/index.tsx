import { createFileRoute } from "@tanstack/react-router";
import { Home } from "@/components/landing/Site";
export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SANA | تجهیزات آزمایشگاهی CBC و POCT" },
      {
        name: "description",
        content:
          "انتخاب و بررسی پنج دستگاه Getein و Finecare؛ مشخصات فنی، کاتالوگ و مشاوره خرید تجهیزات آزمایشگاهی SANA.",
      },
      { property: "og:title", content: "SANA | انتخاب روشن تجهیزات آزمایشگاهی" },
      {
        property: "og:description",
        content: "آنالایزرهای CBC و POCT را بررسی کنید و متناسب با نیاز مرکز خود انتخاب کنید.",
      },
      { property: "og:image", content: "https://cbc.ortanes.com/icon-512.png" },
    ],
    links: [{ rel: "canonical", href: "https://cbc.ortanes.com/" }],
  }),
  component: Home,
});
