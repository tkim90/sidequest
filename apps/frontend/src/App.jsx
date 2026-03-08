import { useEffect, useState } from "react";

function App() {
  const [status, setStatus] = useState("Loading...");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadHealth() {
      try {
        const response = await fetch("/api/health");

        if (!response.ok) {
          throw new Error(`Request failed with ${response.status}`);
        }

        const data = await response.json();

        if (!cancelled) {
          setStatus(data.status);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unknown error");
        }
      }
    }

    loadHealth();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="app-shell">
      <section className="status-card">
        <p className="eyebrow">Sidequest</p>
        <h1>FastAPI + React</h1>
        <p className="message">
          {error ? `Backend unavailable: ${error}` : `Backend status: ${status}`}
        </p>
      </section>
    </main>
  );
}

export default App;
