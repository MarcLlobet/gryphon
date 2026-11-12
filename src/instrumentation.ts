/**
 * Runs once when the Next.js server starts. With `pnpm dev:mock`, MSW
 * intercepts the server's outbound requests (e.g. the STAC API), so the
 * whole app works offline with the same typed mocks the tests use.
 * Mocking happens server-side, so no `mockServiceWorker.js` is needed.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.API_MOCKING === "enabled") {
    const { server } = await import("./mocks/node");
    server.listen({ onUnhandledRequest: "bypass" });
    console.info("[msw] API mocking enabled");
  }
}
