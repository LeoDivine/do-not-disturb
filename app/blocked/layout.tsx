import type { Metadata } from "next";
import { createPageMetadata } from "../../lib/seo/seo-config";

export const metadata: Metadata = createPageMetadata("blocked");

export default function BlockedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
