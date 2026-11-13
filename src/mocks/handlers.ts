import { defaultDocumentHandlers } from "./handlers/defaults";
import { sampleHandlers } from "./handlers/samples";

/**
 * Gryphon has no backend of its own, so everything mocked here is a third-party
 * source the browser would otherwise call directly.
 */
export const handlers = [...defaultDocumentHandlers, ...sampleHandlers];
