"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useTour } from "../../context/tour-context";
import { useTimer } from "../../context/timer-context";
import { useTheme } from "../../context/theme-context";
import { useCloseOnEscape } from "../../lib/overlays/use-close-on-escape";

/**
 * Calculates high-contrast text color (dark on light backgrounds like #64feda,
 * white on dark backgrounds like #0f766e).
 */
function getContrastTextColor(hexColor?: string, isDark?: boolean): string {
  if (!hexColor) return isDark ? "#042f2e" : "#ffffff";
  const hex = hexColor.replace("#", "");
  if (hex.length === 6) {
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const yiq = (r * 299 + g * 587 + b * 114) / 1000;
    return yiq >= 135 ? "#042f2e" : "#ffffff";
  }
  return isDark ? "#042f2e" : "#ffffff";
}

export default function PlatformTour() {
  const {
    isOpen,
    currentStepIndex,
    currentStep,
    totalSteps,
    closeTour,
    nextStep,
    prevStep,
    goToStep,
  } = useTour();

  const { activeColor } = useTimer();
  const { isDark } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Escape key closes the tour overlay
  useCloseOnEscape(isOpen, closeTour);

  // Keyboard navigation: Arrow keys & Enter
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (e.key === "ArrowRight") {
        e.preventDefault();
        nextStep();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        prevStep();
      } else if (e.key === "Enter") {
        e.preventDefault();
        nextStep();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, nextStep, prevStep]);

  if (!isOpen || !mounted) {
    return null;
  }

  const isLastStep = currentStepIndex === totalSteps - 1;
  const isFirstStep = currentStepIndex === 0;
  const buttonTextColor = getContrastTextColor(activeColor, isDark);

  const modalContent = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Platform introduction tour"
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-black/45 dark:bg-black/65 backdrop-blur-xs transition-opacity duration-200"
      onClick={closeTour}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-2xl border bg-white dark:bg-[#0d131d] border-slate-200 dark:border-[#1c2432] shadow-2xl p-6 sm:p-7 text-[#0f172a] dark:text-[#f1f5f9] transition-all transform animate-in fade-in zoom-in-95 duration-150 flex flex-col gap-5 select-none"
      >
        {/* Top bar: minimal progress counter and close button without pills or badges */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono text-slate-400 dark:text-slate-500 tabular-nums">
            {currentStepIndex + 1} of {totalSteps}
          </span>

          <button
            type="button"
            onClick={closeTour}
            aria-label="Close tour"
            title="Close tour"
            className="p-1 rounded text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-300 transition-colors cursor-pointer focus-visible:ring-2 focus-visible:outline-none"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Minimal thin progress hairline (serene, no pills) */}
        <div className="flex items-center gap-1.5 w-full">
          {Array.from({ length: totalSteps }).map((_, idx) => {
            const isCurrent = idx === currentStepIndex;
            const isPast = idx < currentStepIndex;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => goToStep(idx)}
                aria-label={`Go to step ${idx + 1}`}
                className="flex-1 h-0.5 rounded-full transition-all duration-300 cursor-pointer"
                style={{
                  backgroundColor:
                    isCurrent || isPast
                      ? activeColor
                      : "rgba(148, 163, 184, 0.25)",
                  opacity: isCurrent ? 1 : isPast ? 0.6 : 0.3,
                }}
              />
            );
          })}
        </div>

        {/* Content Section: Warm, friendly, calm typography */}
        <div className="flex flex-col gap-2 pt-1">
          <h2 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            {currentStep.title}
          </h2>
          <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400">
            {currentStep.headline}
          </p>
          <p className="text-xs sm:text-[13px] text-slate-600 dark:text-slate-300 leading-relaxed mt-1">
            {currentStep.description}
          </p>

          {/* Key takeaway note: minimal left-accent border callout, unboxed */}
          <div
            className="mt-2.5 pl-3 py-1 border-l-2 text-xs text-slate-500 dark:text-slate-400 leading-normal"
            style={{ borderColor: activeColor }}
          >
            {currentStep.keyTakeaway}
          </div>

          {/* Optional inline destination link for context */}
          {currentStep.routeLabel && currentStep.targetRoute && (
            <div className="mt-2">
              <Link
                href={currentStep.targetRoute}
                onClick={closeTour}
                className="text-xs inline-flex items-center gap-1 font-medium transition-opacity hover:opacity-80"
                style={{ color: activeColor }}
              >
                <span>{currentStep.routeLabel}</span>
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </Link>
            </div>
          )}
        </div>

        {/* Footer Actions: Minimalist layout, standard clean buttons, no pill styling */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-[#1a2332] text-xs">
          <button
            type="button"
            onClick={closeTour}
            className="text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-300 transition-colors cursor-pointer py-1"
          >
            Skip tour
          </button>

          <div className="flex items-center gap-2">
            {!isFirstStep && (
              <button
                type="button"
                onClick={prevStep}
                className="px-3 py-1.5 rounded-lg font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#18202d] transition-colors cursor-pointer"
              >
                Back
              </button>
            )}

            <button
              type="button"
              onClick={nextStep}
              className="px-4 py-1.5 rounded-lg font-semibold transition-all duration-150 cursor-pointer active:scale-95 shadow-xs"
              style={{
                backgroundColor: activeColor,
                color: buttonTextColor,
              }}
            >
              {isLastStep ? "Begin Focusing" : "Continue"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return typeof document !== "undefined"
    ? createPortal(modalContent, document.body)
    : null;
}
