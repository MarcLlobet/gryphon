import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ErrorBoundary } from "./ErrorBoundary";

let shouldThrow = true;
const Fragile = () => {
  if (shouldThrow) throw new Error("WebGL is not available");
  return <p>Map is up</p>;
};

const Harness = () => {
  const [errors, setErrors] = useState(0);
  return (
    <>
      <ErrorBoundary
        onError={() => setErrors((count) => count + 1)}
        fallback={({ error, reset }) => (
          <div role="alert">
            {error.message}
            <button type="button" onClick={reset}>
              Retry
            </button>
          </div>
        )}
      >
        <Fragile />
      </ErrorBoundary>
      <p data-testid="errors">{errors}</p>
    </>
  );
};

describe("ErrorBoundary", () => {
  beforeEach(() => {
    shouldThrow = true;
    // React logs caught render errors; keep the test output readable.
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => vi.restoreAllMocks());

  it("shows the fallback instead of the broken part", () => {
    render(<Harness />);

    expect(screen.getByRole("alert")).toHaveTextContent("WebGL is not available");
  });

  it("reports the error", () => {
    render(<Harness />);

    expect(screen.getByTestId("errors")).toHaveTextContent("1");
  });

  it("renders the children again on reset", async () => {
    render(<Harness />);

    shouldThrow = false;
    await userEvent.click(screen.getByRole("button", { name: "Retry" }));

    expect(screen.getByText("Map is up")).toBeInTheDocument();
  });
});
