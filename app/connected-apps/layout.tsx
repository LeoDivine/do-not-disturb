import type { Metadata } from "next";
import {
  createPageMetadata,
  getBreadcrumbJsonLd,
  serializeJsonLd,
} from "../../lib/seo/seo-config";

export const metadata: Metadata = createPageMetadata("connectedApps");

export default function ConnectedAppsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const breadcrumbJsonLd = getBreadcrumbJsonLd(
    "Connected Apps",
    "/connected-apps"
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
