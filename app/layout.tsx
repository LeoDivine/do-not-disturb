import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { ThemeProvider } from "../context/theme-context";
import { TimerProvider } from "../context/timer-context";
import { SyncProvider } from "../context/sync-context";
import { TourProvider } from "../context/tour-context";
import { AuthProvider } from "../components/auth/auth-provider";
import Navbar from "../components/navbar";
import MobileDesktopNotice from "../components/mobile-desktop-notice";
import Footer from "../components/footer";
import MiniTimerWindow from "../components/mini-timer-window";
import GlobalShortcuts from "../components/global-shortcuts";
import SyncModal from "../components/sync-modal";
import ExtensionInstallBanner from "../components/extension-install-banner";
import OfflineBanner from "../components/offline-banner";
import SessionRewardModal from "../components/gamification/session-reward-modal";
import PlatformTour from "../components/tour/platform-tour";
import DraggableSpotifyWidget from "../components/spotify/draggable-spotify-widget";
import {
  SITE_URL,
  SITE_NAME,
  SITE_DEFAULT_TITLE,
  SITE_DESCRIPTION,
  PAGE_SEO,
  getRootJsonLd,
  serializeJsonLd,
} from "../lib/seo/seo-config";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  colorScheme: "dark light",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf8ff" },
    { media: "(prefers-color-scheme: dark)", color: "#0c1017" },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_DEFAULT_TITLE,
    template: `%s — ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  category: "productivity",
  keywords: Array.from(new Set(PAGE_SEO.home.keywords)),
  referrer: "strict-origin-when-cross-origin",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/android-chrome-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/android-chrome-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    shortcut: ["/favicon.ico"],
  },
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: SITE_NAME,
    statusBarStyle: "black-translucent",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: SITE_DEFAULT_TITLE,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_DEFAULT_TITLE,
    description: SITE_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const rootJsonLd = getRootJsonLd();

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <Script
          id="dnd-theme-mode-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `(function(){
              try {
                var t = localStorage.getItem('dnd-theme');
                if (t === 'light') {
                  document.documentElement.classList.remove('dark');
                  document.documentElement.setAttribute('data-theme', 'light');
                } else {
                  document.documentElement.classList.add('dark');
                  document.documentElement.setAttribute('data-theme', 'dark');
                }
                var m = localStorage.getItem('dnd-session-mode') || 'focus';
                document.documentElement.setAttribute('data-mode', m);
              } catch (e) {
                document.documentElement.classList.add('dark');
                document.documentElement.setAttribute('data-mode', 'focus');
              }
            })();`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col transition-colors duration-200">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: serializeJsonLd(rootJsonLd),
          }}
        />
        <Script src="https://accounts.google.com/gsi/client" strategy="afterInteractive" />
        <ThemeProvider>
          <TimerProvider>
            <AuthProvider>
              <SyncProvider>
                <TourProvider>
                  <Navbar />
                  <MobileDesktopNotice />
                  <ExtensionInstallBanner />
                  <OfflineBanner />
                  <div className="flex-1 flex flex-col">{children}</div>
                  <Footer />
                  <MiniTimerWindow />
                  <GlobalShortcuts />
                  <SyncModal />
                  <SessionRewardModal />
                  <PlatformTour />
                  <DraggableSpotifyWidget />
                </TourProvider>
              </SyncProvider>
            </AuthProvider>
          </TimerProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
