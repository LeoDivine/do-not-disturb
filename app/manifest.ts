import type { MetadataRoute } from "next";
import {
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_SHORT_NAME,
  SITE_DEFAULT_TITLE,
} from "../lib/seo/seo-config";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_DEFAULT_TITLE,
    short_name: SITE_NAME,
    description: SITE_DESCRIPTION,
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#0c1017",
    theme_color: "#0f766e",
    categories: ["productivity", "lifestyle", "utilities", "education"],
    lang: "en-US",
    dir: "ltr",
    icons: [
      {
        src: "/favicon-16x16.png",
        sizes: "16x16",
        type: "image/png",
      },
      {
        src: "/favicon-32x32.png",
        sizes: "32x32",
        type: "image/png",
      },
      {
        src: "/android-chrome-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/android-chrome-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
    shortcuts: [
      {
        name: "Start Focus Timer",
        short_name: SITE_SHORT_NAME,
        description: "Open the Do Not Disturb focus timer and ambient soundscapes",
        url: "/",
        icons: [{ src: "/android-chrome-192x192.png", sizes: "192x192" }],
      },
      {
        name: "Website Blocklist",
        short_name: "Blocklist",
        description: "Manage distracting websites blocked during focus",
        url: "/blocklist",
        icons: [{ src: "/android-chrome-192x192.png", sizes: "192x192" }],
      },
      {
        name: "Focus Statistics",
        short_name: "Stats",
        description: "View your weekly focus rhythm, streaks, and achievements",
        url: "/statistics",
        icons: [{ src: "/android-chrome-192x192.png", sizes: "192x192" }],
      },
      {
        name: "Friendly Focus Tips",
        short_name: "Tips",
        description: "Read calm habits for deep work and mindful breaks",
        url: "/tips",
        icons: [{ src: "/android-chrome-192x192.png", sizes: "192x192" }],
      },
    ],
  };
}
