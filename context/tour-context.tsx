"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import {
  PLATFORM_TOUR_STEPS,
  PlatformTourStep,
  hasSeenPlatformTour,
  setPlatformTourSeen,
  resetPlatformTour as resetStoreTour,
  TOUR_EVENT,
} from "../lib/tour/tour-store";

export const START_TOUR_EVENT = "dnd-start-tour";

interface TourContextType {
  isOpen: boolean;
  currentStepIndex: number;
  currentStep: PlatformTourStep;
  totalSteps: number;
  hasSeenTour: boolean;
  startTour: (initialStep?: number) => void;
  closeTour: () => void;
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (index: number) => void;
  resetTourStatus: () => void;
}

const TourContext = createContext<TourContextType | null>(null);

export function TourProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [hasSeenTour, setHasSeenTour] = useState<boolean>(true); // default true before hydration

  // Check localStorage upon mounting
  useEffect(() => {
    const seen = hasSeenPlatformTour();
    setHasSeenTour(seen);

    // If first-time user and not on the blocked page, trigger tour gently
    if (!seen && pathname !== "/blocked") {
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [pathname]);

  // Sync state when storage changes or when custom events fire
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "dnd_platform_tour_seen") {
        setHasSeenTour(e.newValue === "true");
      }
    };

    const handleTourEvent = (e: CustomEvent<{ seen: boolean }>) => {
      if (e.detail) {
        setHasSeenTour(e.detail.seen);
      }
    };

    const handleStartTourExternal = (e: CustomEvent<{ step?: number }>) => {
      const step = e.detail?.step ?? 0;
      setCurrentStepIndex(step);
      setIsOpen(true);
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener(TOUR_EVENT as any, handleTourEvent);
    window.addEventListener(START_TOUR_EVENT as any, handleStartTourExternal);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener(TOUR_EVENT as any, handleTourEvent);
      window.removeEventListener(START_TOUR_EVENT as any, handleStartTourExternal);
    };
  }, []);

  const startTour = useCallback((initialStep: number = 0) => {
    setCurrentStepIndex(
      Math.max(0, Math.min(initialStep, PLATFORM_TOUR_STEPS.length - 1))
    );
    setIsOpen(true);
  }, []);

  const closeTour = useCallback(() => {
    setIsOpen(false);
    setPlatformTourSeen(true);
    setHasSeenTour(true);
  }, []);

  const nextStep = useCallback(() => {
    setCurrentStepIndex((prev) => {
      if (prev < PLATFORM_TOUR_STEPS.length - 1) {
        return prev + 1;
      }
      // Reached the end of the tour
      closeTour();
      return prev;
    });
  }, [closeTour]);

  const prevStep = useCallback(() => {
    setCurrentStepIndex((prev) => Math.max(0, prev - 1));
  }, []);

  const goToStep = useCallback((index: number) => {
    if (index >= 0 && index < PLATFORM_TOUR_STEPS.length) {
      setCurrentStepIndex(index);
    }
  }, []);

  const resetTourStatus = useCallback(() => {
    resetStoreTour();
    setHasSeenTour(false);
  }, []);

  const currentStep = PLATFORM_TOUR_STEPS[currentStepIndex] || PLATFORM_TOUR_STEPS[0];

  return (
    <TourContext.Provider
      value={{
        isOpen,
        currentStepIndex,
        currentStep,
        totalSteps: PLATFORM_TOUR_STEPS.length,
        hasSeenTour,
        startTour,
        closeTour,
        nextStep,
        prevStep,
        goToStep,
        resetTourStatus,
      }}
    >
      {children}
    </TourContext.Provider>
  );
}

export function useTour() {
  const context = useContext(TourContext);
  if (!context) {
    throw new Error("useTour must be used within a TourProvider");
  }
  return context;
}
