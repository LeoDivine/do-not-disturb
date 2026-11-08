import type { MetadataRoute } from "next";
import { SITE_URL } from "../lib/seo/seo-config";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/blocklist",
          "/statistics",
          "/connected-apps",
          "/settings",
          "/shortcuts",
          "/tips",
          "/privacy",
        ],
        disallow: ["/api/", "/admin", "/callback", "/blocked"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
