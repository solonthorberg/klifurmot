import { useEffect, useState } from "react";
import api from "../services/api";
import RegisterAthletes from "../components/RegisterAthletes";
import CreateCompetition from "../components/CreateCompetition";
import ControlPanelComponent from "../components/ControlPanelComponent";

function ControlPanel() {
  const [view, setView] = useState("competitions");
  const [competitions, setCompetitions] = useState([]);
  const [selectedCompetitionId, setSelectedCompetitionId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState("");
  const [availableYears, setAvailableYears] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchCompetitions = async () => {
    try {
      const response = await api.get("competitions/competitions/");
      setCompetitions(response.data);
      const years = [
        ...new Set(
          response.data.map((comp) => new Date(comp.start_date).getFullYear())
        ),
      ];
      setAvailableYears(years.sort((a, b) => b - a));
    } catch (error) {
      console.error("Error fetching competitions:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompetitions();
  }, []);

  return (
    <div>
      <h2>Stjórnborð</h2>

      {view === "competitions" && (
        <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
          <button onClick={() => setView("create")}>➕ Nýtt mót</button>
        </div>
      )}

      {view === "competitions" && (
        <ControlPanelComponent
          competitions={competitions}
          loading={loading}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          year={year}
          setYear={setYear}
          availableYears={availableYears}
          onRegister={(compId) => {
            console.log("Setting competition ID:", compId); // Debug log
            setSelectedCompetitionId(compId);
            setView("register");
          }}
          onEdit={(compId) => {
            console.log("✏️ Edit not implemented yet for ID:", compId);
            // TODO: Implement edit functionality
            // setSelectedCompetitionId(compId);
            // setView("edit");
          }}
        />
      )}

      {view === "register" && selectedCompetitionId && (
        <RegisterAthletes
          competitionId={selectedCompetitionId}
          goBack={() => {
            setView("competitions");
            setSelectedCompetitionId(null);
          }}
        />
      )}

      {view === "create" && (
        <CreateCompetition
          goBack={() => {
            setView("competitions");
            fetchCompetitions(); // Refresh after creation
          }}
          refreshCompetitions={fetchCompetitions}
        />
      )}
    </div>
  );
}

export default ControlPanel;
