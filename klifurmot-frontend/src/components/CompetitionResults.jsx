import { useEffect, useState, useRef } from "react";
import api from "../services/api";
import config from "../config/Environment"; // Import your config

function CompetitionResults({ competitionId }) {
  const [results, setResults] = useState([]);
  const [error, setError] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedRound, setSelectedRound] = useState("");
  const [loading, setLoading] = useState(true);
  const hasReceivedDataRef = useRef(false);

  useEffect(() => {
    setResults([]);
    setLoading(true);
    setError("");
    hasReceivedDataRef.current = false;

    api
      .get(`/scoring/results/full/${competitionId}/`)
      .then((res) => {
        if (Array.isArray(res.data)) {
          setResults(res.data);
          hasReceivedDataRef.current = true;
        }
        setLoading(false);
      })
      .catch(() => {
        setError("Gat ekki sótt niðurstöður.");
        setLoading(false);
      });
  }, [competitionId]);

  useEffect(() => {
    // Use your config to get the proper WebSocket URL
    const wsUrl = config.getWebSocketUrl(`results/${competitionId}`);
    console.log("🔌 Connecting to WebSocket:", wsUrl);
    
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      console.log("✅ WebSocket connected");
    };

    socket.onmessage = function (event) {
      try {
        const data = JSON.parse(event.data);
        console.log("📨 Message received:", data);
        hasReceivedDataRef.current = true;
        setError("");
        if (Array.isArray(data)) {
          setResults(data);
        } else {
          console.error("Invalid result format", data);
        }
      } catch (err) {
        console.error("WebSocket parse error:", err);
        setError("Villa við að hlaða niðurstöðum.");
      }
    };

    socket.onerror = (e) => {
      console.error("❌ WebSocket error:", e);
      if (!hasReceivedDataRef.current) {
        setError("Tenging við niðurstöðukerfi mistókst.");
      }
    };

    socket.onclose = (e) => {
      console.warn("🔌 WebSocket closed:", e);
    };

    return () => {
      console.log("🧹 Cleaning up WebSocket");
      if (
        socket.readyState === WebSocket.OPEN ||
        socket.readyState === WebSocket.CONNECTING
      ) {
        socket.close();
      }
    };
  }, [competitionId]);

  if (error && !results.length) return <p>{error}</p>;
  if (loading) return <p>Sæki niðurstöður...</p>;
  if (!results.length) return <p>Engar niðurstöður skráðar.</p>;

  const allCategories = results.map((r) => r.category);
  const allRounds = [
    ...new Set(results.flatMap((r) => r.rounds.map((ro) => ro.round_name))),
  ];

  return (
    <div>
      <h3>Niðurstöður</h3>

      <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
        <label>
          Flokkur:
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="">Allir flokkar</option>
            {allCategories.map((cat, i) => (
              <option
                key={i}
                value={cat.id}
              >{`Group ${cat.group_id} - ${cat.gender}`}</option>
            ))}
          </select>
        </label>

        <label>
          Umferð:
          <select
            value={selectedRound}
            onChange={(e) => setSelectedRound(e.target.value)}
          >
            <option value="">Allar umferðir</option>
            {allRounds.map((r, i) => (
              <option key={i} value={r}>
                {r}
              </option>
            ))}
          </select>
        </label>
      </div>

      {results
        .filter(
          (cat) =>
            !selectedCategory || cat.category.id === parseInt(selectedCategory)
        )
        .map((cat, idx) => (
          <div key={idx} style={{ marginBottom: "2rem" }}>
            <h4>{`${cat.category.group.name} - ${cat.category.gender}`}</h4>

            {(cat.rounds || [])
              .filter((r) => !selectedRound || r.round_name === selectedRound)
              .map((round, j) => (
                <div
                  key={j}
                  style={{ marginBottom: "1rem", marginLeft: "1rem" }}
                >
                  <h5>{round.round_name}</h5>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "50px 1fr 80px 80px 100px",
                      fontWeight: "bold",
                      gap: "1rem",
                      paddingBottom: "0.5rem",
                    }}
                  >
                    <span>Nr.</span>
                    <span>Nafn</span>
                    <span>Top</span>
                    <span>Zone</span>
                    <span>Stig</span>
                  </div>

                  {(round.results || []).map((athlete, i) => (
                    <div
                      key={i}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "50px 1fr 80px 80px 100px",
                        gap: "1rem",
                        padding: "0.25rem 0",
                      }}
                    >
                      <span>{athlete.rank}</span>
                      <span>{athlete.full_name}</span>
                      <span>
                        {athlete.tops}T ({athlete.attempts_top})
                      </span>
                      <span>
                        {athlete.zones}Z ({athlete.attempts_zone})
                      </span>
                      <span>
                        {athlete.total_score !== undefined
                          ? athlete.total_score.toFixed(1)
                          : "—"}
                      </span>
                    </div>
                  ))}
                </div>
              ))}
          </div>
        ))}
    </div>
  );
}

export default CompetitionResults;