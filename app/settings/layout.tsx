import type { Metadata } from "next";
import {
  createPageMetadata,
  getBreadcrumbJsonLd,
  serializeJsonLd,
} from "../../lib/seo/seo-config";

export const metadata: Metadata = createPageMetadata("settings");

export default function SettingsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const breadcrumbJsonLd = getBreadcrumbJsonLd(
    "Preferences & Settings",
    "/settings"
  );

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
