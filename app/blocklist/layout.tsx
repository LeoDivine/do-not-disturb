import type { Metadata } from "next";
import {
  createPageMetadata,
  getBreadcrumbJsonLd,
  serializeJsonLd,
} from "../../lib/seo/seo-config";

export const metadata: Metadata = createPageMetadata("blocklist");

export default function BlocklistLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const breadcrumbJsonLd = getBreadcrumbJsonLd("Website Blocklist", "/blocklist");

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
