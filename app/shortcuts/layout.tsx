import type { Metadata } from "next";
import {
  createPageMetadata,
  getBreadcrumbJsonLd,
  getFaqJsonLd,
  serializeJsonLd,
} from "../../lib/seo/seo-config";

export const metadata: Metadata = createPageMetadata("shortcuts");

const SHORTCUTS_FAQS = [
  {
    question: "Do keyboard shortcuts interfere while I am typing?",
    answer:
      "No. For your convenience, keyboard shortcuts are automatically paused whenever you are typing in search boxes, input fields, or text areas so you won't trigger unwanted actions.",
  },
  {
    question:
      "Can I use shortcuts when I am in another window or desktop application?",
    answer:
      "Yes! If you have installed our companion browser extension, you can set global system-wide shortcuts via chrome://extensions/shortcuts to control your timer without switching tabs.",
  },
  {
    question: "Can I assign multi-key combinations?",
    answer:
      "Yes. You can press combinations like Ctrl+Shift+S or Alt+P, as well as single keys like Space, R, or 1. Just click 'Edit' next to any shortcut and press your new keys.",
  },
  {
    question: "How do I return back to the default shortcuts?",
    answer:
      "Simply click the 'Reset Defaults' button at the top right of this page at any time to restore all shortcuts back to their original keys.",
  },
] as const;

export default function ShortcutsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const breadcrumbJsonLd = getBreadcrumbJsonLd(
    "Keyboard Shortcuts",
    "/shortcuts"
  );
  const faqJsonLd = getFaqJsonLd(SHORTCUTS_FAQS);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd(breadcrumbJsonLd),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd(faqJsonLd),
        }}
      />
      {children}
    </>
  );
}
