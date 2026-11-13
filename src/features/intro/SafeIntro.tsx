"use client";

/**
 * The intro behind its own error boundary. If the intro breaks, it simply
 * disappears: it must never block the map.
 *
 * A client component on purpose: the boundary's fallback is a function, and
 * functions cannot be passed from a Server Component (the page) to a client one.
 */
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Intro } from "./Intro";

const nothing = () => null;

export const SafeIntro = () => (
  <ErrorBoundary fallback={nothing}>
    <Intro />
  </ErrorBoundary>
);
