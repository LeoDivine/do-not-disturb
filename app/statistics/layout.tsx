import type { Metadata } from "next";
import {
  createPageMetadata,
  getBreadcrumbJsonLd,
  serializeJsonLd,
} from "../../lib/seo/seo-config";

export const metadata: Metadata = createPageMetadata("statistics");

export default function StatisticsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const breadcrumbJsonLd = getBreadcrumbJsonLd("Focus Statistics", "/statistics");

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd(breadcrumbJsonLd),
        }}
      />
      {children}
    </>
  );
}
