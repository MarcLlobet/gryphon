import { setupWorker } from "msw/browser";
import { handlers } from "./handlers";

/**
 * Sources are fetched from the browser now, so mocking happens here rather than in
 * the Next.js server. `pnpm dev:mock` starts this worker and the whole app runs
 * offline against the same fixtures the tests use.
 */
export const worker = setupWorker(...handlers);
