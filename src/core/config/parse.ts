/**
 * The boundary where an untrusted JSON document becomes a typed config.
 *
 * Everything downstream — renderers, the map, the layer panel — may assume a
 * `GryphonConfig` is valid, because this is the only way to obtain one.
 */
import { z } from "zod";
import { err, ok, type Result } from "@/core/result";
import { ConfigSchema, type GryphonConfig } from "./schema";

/** One validation failure, addressed by a path the editor can highlight. */
export interface ConfigIssue {
  /** JSON-pointer-ish path, e.g. `layers/1/url`. Empty string for the document root. */
  readonly path: string;
  readonly message: string;
}

export const toIssues = (error: z.ZodError): ConfigIssue[] =>
  error.issues.map((issue) => ({ path: issue.path.join("/"), message: issue.message }));

/** Validates any value against the schema, filling in documented defaults. */
export const parseConfig = (input: unknown): Result<GryphonConfig, ConfigIssue[]> => {
  const result = ConfigSchema.safeParse(input);
  return result.success ? ok(result.data) : err(toIssues(result.error));
};

/** Parses a raw JSON string, so a malformed document reads as one issue, not a crash. */
export const parseConfigJson = (text: string): Result<GryphonConfig, ConfigIssue[]> => {
  try {
    return parseConfig(JSON.parse(text));
  } catch (cause) {
    return err([{ path: "", message: cause instanceof Error ? cause.message : "Invalid JSON." }]);
  }
};
