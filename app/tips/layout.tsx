import type { Metadata } from "next";
import {
  createPageMetadata,
  getBreadcrumbJsonLd,
  serializeJsonLd,
  SITE_URL,
} from "../../lib/seo/seo-config";

export const metadata: Metadata = createPageMetadata("tips");

const TIPS_ITEM_LIST = {
  "@context": "https://schema.org",
  "@type": "ItemList",
  name: "Friendly Focus Tips & Mindful Deep Work Habits",
  description:
    "Simple reminders and gentle habits to help you protect your time, feel calm, and stay in flow.",
  url: `${SITE_URL}/tips`,
  itemListElement: [
    {
      "@type": "ListItem",
      position: 1,
      name: "The 10-Second Pause",
      description:
        "Keep your blocklist active during focus sprints so a brief moment of friction prevents autopilot distraction.",
    },
    {
      "@type": "ListItem",
      position: 2,
      name: "Win the First 30 Minutes",
      description:
        "Spend your first half-hour on the one task that matters most before opening email, chat apps, or social feeds.",
    },
    {
      "@type": "ListItem",
      position: 3,
      name: "The Two-Minute Start",
      description:
        "Lower pressure on intimidating projects by committing to work for only two minutes.",
    },
    {
      "@type": "ListItem",
      position: 4,
      name: "Real Rest Beats Scrolling",
      description:
        "Step away from screens during breaks to stretch, hydrate, and rest your eyes.",
    },
    {
      "@type": "ListItem",
      position: 5,
      name: "Gentle Soundscapes",
      description:
        "Use steady ambient rain, cafe sounds, or focus tones to mask unpredictable room noise.",
    },
    {
      "@type": "ListItem",
      position: 6,
      name: "One Thing at a Time",
      description:
        "Avoid multitasking and give a single task your full attention during each focus interval.",
    },
  ],
};

export default function TipsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const breadcrumbJsonLd = getBreadcrumbJsonLd("Friendly Tips", "/tips");

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
          __html: serializeJsonLd(TIPS_ITEM_LIST),
        }}
      />
      {children}
    </>
  );
}
