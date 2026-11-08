import type { Metadata } from "next";
import { createPageMetadata } from "../../lib/seo/seo-config";

export const metadata: Metadata = createPageMetadata("callback");

export default function CallbackLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
