"use client";

import { createContext, useCallback, useContext, useState, useSyncExternalStore, type ReactNode } from "react";
import { createBootTracker, snapshotOf, type BootSnapshot, type BootTaskId, type BootTracker } from "./boot";

const BootContext = createContext<BootTracker | null>(null);

export const BootProvider = ({ children }: { children: ReactNode }) => {
  const [tracker] = useState(() => createBootTracker());
  return <BootContext.Provider value={tracker}>{children}</BootContext.Provider>;
};

const EMPTY = snapshotOf({});
const noopSubscribe = () => () => {};

/** Marks a milestone. A no-op outside a BootProvider, so components stay usable alone. */
export const useBootMark = (): ((id: BootTaskId) => void) => {
  const tracker = useContext(BootContext);
  return useCallback((id: BootTaskId) => tracker?.mark(id), [tracker]);
};

export const useBootSnapshot = (): BootSnapshot => {
  const tracker = useContext(BootContext);
  return useSyncExternalStore(tracker?.subscribe ?? noopSubscribe, tracker?.getSnapshot ?? (() => EMPTY), () => EMPTY);
};
