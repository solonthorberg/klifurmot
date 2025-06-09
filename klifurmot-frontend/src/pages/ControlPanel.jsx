import { useEffect, useState } from 'react';
import api from "../services/api";
import CompetitionList from '../components/CompetitionList';
import RegisterAthletes from '../components/RegisterAthletes';
import CreateCompetition from '../components/CreateCompetition';

function ControlPanel() {
    const [view, setView] = useState("competitions");
    const [competitions, setCompetitions] = useState([]);
    const [selectedCompetitionId, setSelectedCompetitionId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [year, setYear] = useState('');
    const [availableYears, setAvailableYears] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');

    const fetchCompetitions = async () => {
        try {
            const response = await api.get("competitions/competitions/");
            setCompetitions(response.data);
            const years = [...new Set(response.data.map(comp => new Date(comp.start_date).getFullYear()))];
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

            {/* Only show this when NOT creating a competition */}
            {view !== "create" && (
                <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
                    <button onClick={() => setView("create")}>➕ Nýtt mót</button>
                </div>
            )}

            {view === "competitions" && (
                <CompetitionList
                    competitions={competitions}
                    loading={loading}
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    year={year}
                    setYear={setYear}
                    availableYears={availableYears}
                    onRegister={(compId) => {
                        setSelectedCompetitionId(compId);
                        setView("register");
                    }}
                />
            )}

            {view === "register" && selectedCompetitionId && (
                <RegisterAthletes
                    competitionId={selectedCompetitionId}
                    goBack={() => setView("competitions")}
                />
            )}

            {view === "create" && (
                <CreateCompetition
                    goBack={() => setView("competitions")}
                    refreshCompetitions={fetchCompetitions}
                />
            )}
        </div>
    );
}

export default ControlPanel;
