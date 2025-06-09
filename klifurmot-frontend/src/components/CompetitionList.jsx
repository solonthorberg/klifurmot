import React from "react";

function CompetitionList({
  competitions,
  loading,
  searchQuery,
  setSearchQuery,
  year,
  setYear,
  availableYears,
  onRegister // callback to notify ControlPanel which competition to register for
}) {
  const filteredCompetitions = competitions
    .sort((a, b) => new Date(b.start_date) - new Date(a.start_date))
    .filter(comp => {
      const matchesYear = year
        ? new Date(comp.start_date).getFullYear() === parseInt(year)
        : true;
      const matchesSearch = comp.title
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      return matchesYear && matchesSearch;
    });

  return (
    <div>
      <input
        type="text"
        placeholder="Leita af móti..."
        value={searchQuery}
        onChange={e => setSearchQuery(e.target.value)}
      />

      <select value={year} onChange={e => setYear(e.target.value)}>
        <option value="">All Years</option>
        {availableYears.map(y => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>

      {loading ? (
        <p>Hleður inn mót...</p>
      ) : filteredCompetitions.length === 0 ? (
        <p>Engin mót fundust.</p>
      ) : (
        <div>
          {filteredCompetitions.map(comp => (
            <div key={comp.id}>
              {comp.image && (
                <img
                  src={comp.image}
                  alt={comp.title}
                />
              )}
              <h3>{comp.title}</h3>
              <p>
                {new Date(comp.start_date).toLocaleDateString("is-IS")} –{" "}
                {new Date(comp.end_date).toLocaleDateString("is-IS")}
              </p>
              <p>{comp.description || "Engin lýsing tiltæk."}</p>
              <a href={`/competitions/${comp.id}`}>Skoða nánar</a>
              <br />
              <button onClick={() => onRegister(comp.id)}>Skrá keppendur</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default CompetitionList;
