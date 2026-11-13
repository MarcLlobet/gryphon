import { describe, expect, it } from "vitest";
import { defaultConfig } from "@/core/config/default";
import { isIconName } from "./icons";

describe("layer icons", () => {
  it("knows Lucide names", () => {
    expect(isIconName("thermometer")).toBe(true);
    expect(isIconName("cloud-rain")).toBe(true);
  });

  it("rejects names that are not in the set", () => {
    expect(isIconName("weather")).toBe(false);
  });

  it("only uses real icons in the shipped document", () => {
    const icons = (defaultConfig.layers ?? []).flatMap((layer) => (layer.icon ? [layer.icon] : []));

    expect(icons.length).toBeGreaterThan(0);
    expect(icons.filter((name) => !isIconName(name))).toEqual([]);
  });
});
