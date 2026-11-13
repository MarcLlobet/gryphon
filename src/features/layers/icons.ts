/**
 * Layer icons by name. Any Lucide icon can be named in the document
 * ("thermometer", "cloud-rain"…); this is the one place that knows the icon set.
 */
import { iconNames, type IconName } from "lucide-react/dynamic";
import { useEffect } from "react";

const NAMES: ReadonlySet<string> = new Set(iconNames);

export const isIconName = (name: string): name is IconName => NAMES.has(name);

/**
 * Each Lucide icon is its own small chunk, normally requested when its row renders,
 * one after another. Starting them all together, as soon as the list is known,
 * turns that waterfall into one parallel batch.
 */
export const usePrefetchIcons = (names: readonly (string | undefined)[]): void => {
  const key = names.filter((name): name is IconName => name !== undefined && isIconName(name)).join(",");

  useEffect(() => {
    if (key === "") {
      return;
    }
    void import("lucide-react/dynamicIconImports").then(({ default: imports }) => {
      for (const name of key.split(",")) {
        void (imports as Record<string, (() => Promise<unknown>) | undefined>)[name]?.();
      }
    });
  }, [key]);
};
