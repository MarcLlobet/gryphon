"use client";

import { useEffect, useState, type ReactNode } from "react";

const MOCKING_ENABLED = process.env.NEXT_PUBLIC_API_MOCKING === "enabled";

/**
 * Holds the first paint until the service worker is intercepting, so no layer races
 * past the mocks and hits the real network.
 */
export const Mocking = ({ children }: { children: ReactNode }) => {
  const [ready, setReady] = useState(!MOCKING_ENABLED);

  useEffect(() => {
    if (!MOCKING_ENABLED) {
      return;
    }
    void import("@/mocks/browser").then(({ worker }) =>
      worker.start({ onUnhandledRequest: "bypass" }).then(() => setReady(true)),
    );
  }, []);

  return ready ? children : null;
};
