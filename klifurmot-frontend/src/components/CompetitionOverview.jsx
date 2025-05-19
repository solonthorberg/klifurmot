import React from "react";

function CompetitionOverview({ competition }) {
    if (!competition) return <p>Sæki upplýsingar um mótið...</p>;

    return (
        <div>
            {competition.image && (
              <div style={{ marginBottom: "1rem" }}>
                <img
                  src={competition.image}
                  alt={competition.title}
                  style={{
                    height: "200px",
                    objectFit: "cover",
                    borderRadius: "8px"
                  }}
                />
              </div>
          )}

        <h2 style={{ marginBottom: "0.5rem" }}>{competition.title}</h2>

        <p>
          <strong>Dagsetning:</strong> {competition.start_date} – {competition.end_date}
        </p>
        <p>
          <strong>Staðsetning:</strong> {competition.location}
        </p>

        {competition.price && (
          <p>
            <strong>Verð:</strong> {competition.price} kr
          </p>
        )}

        {competition.description && (
          <div style={{ marginTop: "1rem", marginBottom: "1rem" }}>
            <h4>Lýsing</h4>
            <p>{competition.description}</p>
          </div>
        )}

        {competition.categories && competition.categories.length > 0 && (
          <div style={{ marginTop: "2rem" }}>
            <h4>Flokkar og Umferðir</h4>
            {competition.categories.map((cat) => (
              <div key={cat.id} style={{ marginBottom: "1rem" }}>
                <h5>{cat.name}</h5>
                {cat.rounds?.length > 0 ? (
                  <ul style={{ paddingLeft: "1.5rem" }}>
                    {cat.rounds.map((round) => (
                      <li key={round.id}>
                        {round.name} – {round.num_boulders} leiðir, {round.num_athletes} keppendur
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>Engar umferðir skráðar.</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
}

export default CompetitionOverview;
