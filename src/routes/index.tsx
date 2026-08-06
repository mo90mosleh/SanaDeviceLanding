import { createFileRoute } from "@tanstack/react-router";
import { Hero } from "@/components/landing/Hero";
import { LeadForm } from "@/components/landing/LeadForm";
import {
  PainPoints,
  Features,
  Offer,
  WhyUs,
  Faq,
  StickyCta,
  Footer,
} from "@/components/landing/Sections";

const title = "واگذاری رایگان سل کانتر GETEIN BHA3000 | سانا شفابخش راسپینا";
const description =
  "طرح واگذاری دستگاه سل کانتر GETEIN BHA3000 با دریافت اعتبار خرید لوازم مصرفی آزمایشگاه معادل ارزش دستگاه؛ همراه با ۱ سال گارانتی بی‌قید و شرط.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <main>
      <Hero />
      <PainPoints />
      <Features />
      <Offer />
      <WhyUs />
      <Faq />
      <LeadForm />
      <Footer />
      <StickyCta />
    </main>
  );
}
