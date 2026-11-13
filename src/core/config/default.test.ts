import { describe, expect, it } from "vitest";
import { defaultConfig } from "./default";
import { parseConfig } from "./parse";
import { ConfigSchema } from "./schema";

describe("the shipped default document", () => {
  it("is a valid config", () => {
    const result = parseConfig(defaultConfig);

    // Surface the real issues rather than a bare `false` when this ever breaks.
    expect(result.ok ? [] : result.error).toEqual([]);
    expect(result.ok).toBe(true);
  });

  it("needs no credentials, so the app is useful with no setup", () => {
    const config = ConfigSchema.parse(defaultConfig);

    expect(config.layers.every((layer) => layer.auth === undefined)).toBe(true);
  });

  it("gives every layer a unique id", () => {
    const config = ConfigSchema.parse(defaultConfig);
    const ids = config.layers.map((layer) => layer.id);

    expect(new Set(ids).size).toBe(ids.length);
  });
});
