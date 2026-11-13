"use client";

/**
 * The last line of defence: an error in the root layout itself. It replaces the
 * layout, so it brings its own <html> and inline styles.
 */
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#0b1020",
          color: "#e8ecf4",
          fontFamily: "system-ui, sans-serif",
          padding: "0 16px",
          textAlign: "center",
        }}
      >
        <main>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 500 }}>Gryphon could not start.</h1>
          <p style={{ color: "#a9b2c7" }}>Reload the page to try again.</p>
          <button
            type="button"
            onClick={reset}
            style={{
              minHeight: 44,
              padding: "0 20px",
              border: 0,
              borderRadius: 999,
              background: "#ff6a1a",
              color: "#0b1020",
              font: "inherit",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
