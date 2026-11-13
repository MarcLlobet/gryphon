/**
 * TypeScript is authored; JSON Schema is generated. External config authors and
 * editors validate against `public/gryphon.schema.json`, and this test is what keeps
 * that file honest: change the Zod schema without regenerating and CI fails.
 *
 *   pnpm test -u   regenerates it
 */
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { ConfigSchema } from "./schema";

describe("the generated JSON Schema", () => {
  const jsonSchema = z.toJSONSchema(ConfigSchema, { io: "input", unrepresentable: "any" });

  it("describes the document an author writes", () => {
    const { properties } = jsonSchema as { properties: Record<string, unknown> };

    expect(Object.keys(properties)).toEqual(expect.arrayContaining(["version", "basemap", "view", "layers"]));
  });

  it("stays in sync with the published file", async () => {
    await expect(`${JSON.stringify(jsonSchema, null, 2)}\n`).toMatchFileSnapshot("../../../public/gryphon.schema.json");
  });
});
