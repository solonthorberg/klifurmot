import React from "react";

function ControlPanelComponent({
  competitions,
  loading,
  searchQuery,
  setSearchQuery,
  year,
  setYear,
  availableYears,
  onRegister,
  onEdit,
}) {
  const filteredCompetitions = competitions.filter((comp) => {
    const matchesSearch = comp.title
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesYear = year
      ? new Date(comp.start_date).getFullYear() === parseInt(year)
      : true;
    return matchesSearch && matchesYear;
  });

  return (
    <div>
      <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
        <input
          type="text"
          placeholder="Leita eftir titli..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />

        <select value={year} onChange={(e) => setYear(e.target.value)}>
          <option value="">Allar dagsetningar</option>
          {availableYears.map((yr) => (
            <option key={yr} value={yr}>
              {yr}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <p>Hleður mótum...</p>
      ) : (
        <ul>
          {filteredCompetitions.map((comp) => (
            <li key={comp.id} style={{ marginBottom: "1rem" }}>
              <strong>{comp.title}</strong> <br />
              {new Date(comp.start_date).toLocaleDateString()} –{" "}
              {new Date(comp.end_date).toLocaleDateString()}
              <div style={{ marginTop: "0.5rem" }}>
                <button onClick={() => onRegister(comp.id)}>
                  Skrá keppendur
                </button>
                <button onClick={() => onEdit(comp.id)}>Breyta mót</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default ControlPanelComponent;
