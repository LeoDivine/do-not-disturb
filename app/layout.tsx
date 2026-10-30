import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { ThemeProvider } from "../context/theme-context";
import { TimerProvider } from "../context/timer-context";
import { SyncProvider } from "../context/sync-context";
import { AuthProvider } from "../components/auth/auth-provider";
import Navbar from "../components/navbar";
import MobileDesktopNotice from "../components/mobile-desktop-notice";
import Footer from "../components/footer";
import MiniTimerWindow from "../components/mini-timer-window";
import GlobalShortcuts from "../components/global-shortcuts";
import SyncModal from "../components/sync-modal";
import ExtensionInstallBanner from "../components/extension-install-banner";
import SessionRewardModal from "../components/gamification/session-reward-modal";

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
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf8ff" },
    { media: "(prefers-color-scheme: dark)", color: "#0c1017" },
  ],
};

export const metadata: Metadata = {
  title: "Do Not Disturb — Stay Focused & In the Zone",
  description: "A simple, distraction-free space to help you do your best work and stay focused.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
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
        <Script src="https://accounts.google.com/gsi/client" strategy="afterInteractive" />
        <ThemeProvider>
          <TimerProvider>
            <AuthProvider>
              <SyncProvider>
                <Navbar />
                <MobileDesktopNotice />
                <ExtensionInstallBanner />
                <div className="flex-1 flex flex-col">{children}</div>
                <Footer />
                <MiniTimerWindow />
                <GlobalShortcuts />
                <SyncModal />
                <SessionRewardModal />
              </SyncProvider>
            </AuthProvider>
          </TimerProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
