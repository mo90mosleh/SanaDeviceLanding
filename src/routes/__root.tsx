import { assetPath, pagePath } from "@/lib/site-path";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Outlet, createRootRouteWithContext, HeadContent, Scripts } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { Header, Footer } from "@/components/landing/Site";
import appCss from "../styles.css?url";
function NotFound() {
  return (
    <>
      <Header />
      <main id="main" className="fallback">
        <span className="eyebrow">۴۰۴</span>
        <h1>این صفحه پیدا نشد.</h1>
        <p>از میان دستگاه‌های CBC و POCT، محصول مورد نظر خود را انتخاب کنید.</p>
        <a className="button primary" href={pagePath("/")}>
          <span className="button-label">بازگشت به دستگاه‌ها</span>
          <ArrowLeft className="cta-icon" size={20} strokeWidth={2} aria-hidden="true" />
        </a>
      </main>
      <Footer />
    </>
  );
}
function ErrorPage() {
  return (
    <main className="fallback">
      <h1>بارگذاری صفحه انجام نشد.</h1>
      <p>لطفاً صفحه را دوباره بارگذاری کنید یا به صفحه اصلی برگردید.</p>
      <a className="button primary" href={pagePath("/")}>
        صفحه اصلی
      </a>
    </main>
  );
}
export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "SANA | تجهیزات تشخیص آزمایشگاهی" },
      {
        name: "description",
        content: "انتخاب دستگاه‌های هماتولوژی Getein و ایمونوفلورسانس Finecare با SANA.",
      },
      { name: "author", content: "SANA" },
      { name: "theme-color", content: "#02753b" },
      { property: "og:type", content: "website" },
      { property: "og:locale", content: "fa_IR" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: assetPath("/favicon.ico?v=red-s-20261024"), sizes: "16x16 24x24 32x32 48x48 64x64 128x128 256x256" },
      { rel: "icon", href: assetPath("/favicon.png?v=red-s-20261024"), type: "image/png", sizes: "64x64" },
      { rel: "apple-touch-icon", href: assetPath("/apple-touch-icon.png?v=red-s-20261024") },
      { rel: "manifest", href: assetPath("/site.webmanifest?v=red-s-20261024") },
    ],
  }),
  shellComponent: Shell,
  component: Root,
  notFoundComponent: NotFound,
  errorComponent: ErrorPage,
});
function Shell({ children }: { children: ReactNode }) {
  return (
    <html lang="fa" dir="rtl">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}
function Root() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
    </QueryClientProvider>
  );
}
