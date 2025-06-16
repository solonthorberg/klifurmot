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

  const resetView = () => {
    setView("competitions");
    setSelectedCompetitionId(null);
  };

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
            console.log("Setting competition ID for registration:", compId);
            setSelectedCompetitionId(compId);
            setView("register");
          }}
          onEdit={(compId) => {
            console.log("Setting competition ID for editing:", compId);
            setSelectedCompetitionId(compId);
            setView("edit");
          }}
        />
      )}

      {view === "register" && selectedCompetitionId && (
        <RegisterAthletes
          competitionId={selectedCompetitionId}
          goBack={resetView}
        />
      )}

      {view === "edit" && selectedCompetitionId && (
        <CreateCompetition
          competitionId={selectedCompetitionId}
          goBack={resetView}
          refreshCompetitions={fetchCompetitions}
        />
      )}

      {view === "create" && (
        <CreateCompetition
          goBack={() => {
            resetView();
            fetchCompetitions(); // Refresh after creation
          }}
          refreshCompetitions={fetchCompetitions}
        />
      )}
    </div>
  );
}

export default ControlPanel;