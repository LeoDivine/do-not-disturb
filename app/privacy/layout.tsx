import type { Metadata } from "next";
import {
  createPageMetadata,
  getBreadcrumbJsonLd,
  getFaqJsonLd,
  serializeJsonLd,
} from "../../lib/seo/seo-config";

export const metadata: Metadata = createPageMetadata("privacy");

const PRIVACY_FAQS = [
  {
    question: "Do I need to sign up to use Do Not Disturb?",
    answer:
      "No. You never have to create an account, provide an email address, or create a password. You can use every single timer, ambient sound, statistic, achievement, and blocking feature completely as a guest.",
  },
  {
    question: "Can anyone see the websites I visit or block?",
    answer:
      "No. The companion browser extension blocks sites using your browser's built-in rule engine, so it never reads or records your general browsing history. The only thing noted is when you try to open a site that is on your blocklist during a focus session (the site name and time), which powers your deflection stats. That log stays on your device unless you turn on Cloud Sync.",
  },
  {
    question: "What is saved if I choose to use Cloud Sync?",
    answer:
      "Cloud Sync is completely optional. If you sign in, we store your email, display name, and profile picture, plus the data needed to restore your setup on another device: timer settings, sound choices, keyboard shortcuts, your blocklist, focus session history, deflection logs, streaks, Flow XP, and unlocked achievements.",
  },
  {
    question: "Does Do Not Disturb use cookies?",
    answer:
      "Only one, and only if you sign in to Cloud Sync: a secure, HTTP-only session cookie that keeps you logged in for up to 30 days. There are no analytics, advertising, or third-party tracking cookies. Guests get no cookies at all.",
  },
  {
    question: "Does the soothing sound player stream audio over the internet?",
    answer:
      "No. Rain, ambient waves, and focus tones are synthesized directly inside your browser using mathematical audio waves. Zero audio files are downloaded, which protects your bandwidth and privacy.",
  },
  {
    question: "How do I move my setup to another computer?",
    answer:
      "Click 'Download backup' to save your settings and blocklists to a small file, then click 'Restore backup' on your other computer. Or, simply sign in with optional Cloud Sync to sync them automatically.",
  },
  {
    question: "How do I completely erase my data?",
    answer:
      "Click 'Reset data' on this page anytime. You can clear your focus history, reset your blocklist, or erase everything saved in this browser with a single click.",
  },
] as const;

export default function PrivacyLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const breadcrumbJsonLd = getBreadcrumbJsonLd("Privacy First", "/privacy");
  const faqJsonLd = getFaqJsonLd(PRIVACY_FAQS);

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
