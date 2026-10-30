import type { Metadata } from "next";
import Link from "next/link";
import NotFoundBackButton from "../components/not-found-back-button";

export const metadata: Metadata = {
  title: "Page Not Found — Do Not Disturb",
  description:
    "The requested page could not be found. Take a gentle breath and return to your focus.",
};

export default function NotFound() {
  const quickLinks = [
    {
      title: "Focus Timer",
      description: "Start or resume your distraction-free session",
      href: "/",
      icon: (
        <svg
          className="w-4 h-4 text-[#0f766e] dark:text-[#64ffda] shrink-0 mt-0.5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.75}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
    },
    {
      title: "Friendly Tips",
      description: "Gentle ideas for focus, pauses, and habits",
      href: "/tips",
      icon: (
        <svg
          className="w-4 h-4 text-[#0f766e] dark:text-[#64ffda] shrink-0 mt-0.5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.75}
            d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
          />
        </svg>
      ),
    },
    {
      title: "Blocklist",
      description: "Manage your mindful boundaries and site blocks",
      href: "/blocklist",
      icon: (
        <svg
          className="w-4 h-4 text-[#0f766e] dark:text-[#64ffda] shrink-0 mt-0.5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.75}
            d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
          />
        </svg>
      ),
    },
    {
      title: "Keyboard Shortcuts",
      description: "Navigate with swift, effortless keystrokes",
      href: "/shortcuts",
      icon: (
        <svg
          className="w-4 h-4 text-[#0f766e] dark:text-[#64ffda] shrink-0 mt-0.5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.75}
            d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
          />
        </svg>
      ),
    },
  ];

  return (
    <main className="flex-1 flex flex-col items-center justify-center px-4 py-12 sm:px-6 sm:py-20 text-center">
      <div className="w-full max-w-xl mx-auto flex flex-col items-center">
        {/* Minimalist zen artwork: gentle concentric ripples centering focus */}
        <div className="relative mb-8 flex items-center justify-center" aria-hidden="true">
          <svg
            className="w-24 h-24 text-slate-300 dark:text-slate-700"
            viewBox="0 0 96 96"
            fill="none"
            stroke="currentColor"
          >
            <circle
              cx="48"
              cy="48"
              r="44"
              strokeWidth="1"
              strokeDasharray="3 3"
              className="opacity-40"
            />
            <circle
              cx="48"
              cy="48"
              r="30"
              strokeWidth="1.25"
              className="opacity-70"
            />
            <circle
              cx="48"
              cy="48"
              r="16"
              strokeWidth="1.5"
            />
            <circle
              cx="48"
              cy="48"
              r="2.5"
              fill="currentColor"
            />
          </svg>
        </div>

        {/* Minimalist status line (plain typography, strictly no pill or badge) */}
        <p className="font-mono text-xs uppercase tracking-[0.25em] text-[#64748b] dark:text-[#7e8c9f] mb-3">
          404 · Page Not Found
        </p>

        {/* Empathetic, friendly headline */}
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#0f172a] dark:text-[#f1f5f9] mb-4">
          A quiet moment off the path
        </h1>

        {/* User-friendly, calming description */}
        <p className="text-sm sm:text-base text-[#64748b] dark:text-[#7e8c9f] leading-relaxed max-w-md mb-8">
          The page you are looking for may have been moved, renamed, or never created. Take a gentle breath — getting lost is just an unexpected pause.
        </p>

        {/* Direct recovery actions (clean rectangular buttons, no pills or badges) */}
        <div className="flex flex-wrap items-center justify-center gap-3 mb-12">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium bg-[#0f766e] hover:bg-[#115e59] dark:bg-[#64ffda] dark:hover:bg-[#52e8c4] text-white dark:text-[#0c1017] transition-colors shadow-xs cursor-pointer"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
            <span>Return to Focus</span>
          </Link>
          <NotFoundBackButton />
        </div>

        {/* Helpful navigation suggestions */}
        <div className="w-full pt-8 border-t border-[#e2e8f0] dark:border-[#1d2634] text-left">
          <p className="text-xs font-mono uppercase tracking-wider text-[#64748b] dark:text-[#7e8c9f] mb-4 text-center">
            Or jump directly to a familiar space
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg mx-auto">
            {quickLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="group flex items-start gap-3 p-3.5 rounded-lg border border-[#e2e8f0] dark:border-[#1d2634] bg-white/60 dark:bg-[#101620]/60 hover:bg-slate-50 dark:hover:bg-[#141b24] hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
              >
                {item.icon}
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-[#0f172a] dark:text-[#f1f5f9] group-hover:text-[#0f766e] dark:group-hover:text-[#64ffda] transition-colors flex items-center justify-between">
                    <span>{item.title}</span>
                    <span
                      aria-hidden="true"
                      className="text-xs text-[#64748b] dark:text-[#7e8c9f] opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      →
                    </span>
                  </div>
                  <p className="text-xs text-[#64748b] dark:text-[#7e8c9f] mt-0.5 line-clamp-1">
                    {item.description}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
