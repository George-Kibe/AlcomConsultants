"use client"; // Replaces the root layout when it fails, so it renders its own <html>.

export default function GlobalError({
  retry,
}: {
  error: Error;
  retry: () => void;
}) {
  return (
    <html lang="en-KE">
      <body
        style={{
          fontFamily: "system-ui, sans-serif",
          display: "grid",
          placeItems: "center",
          minHeight: "100dvh",
          margin: 0,
          textAlign: "center",
          color: "#17142e",
        }}
      >
        <div>
          <h1>Something went wrong</h1>
          <p>Sorry, the site is having trouble right now.</p>
          <button
            onClick={() => retry()}
            style={{
              background: "#27225c",
              color: "#fff",
              border: 0,
              borderRadius: 12,
              padding: "12px 20px",
              fontSize: 16,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
