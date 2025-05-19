import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import CompetitionOverview from "../components/CompetitionOverview";
import CompetitionAthletes from "../components/CompetitionAthletes";
import CompetitionBoulders from "../components/CompetitionBoulders";
import CompetitionStartlist from "../components/CompetitionStartlist";
import CompetitionResults from "../components/CompetitionResults";
import api from "../services/api";

function CompetitionDetails() {

    const { id } = useParams();
    const [competition, setCompetition] = useState(null);
    const [activeTab, setActiveTab] = useState("competition");
    const [error, setError] = useState("");

    useEffect(() => {
        const fetchCompetition = async () => {
        try {
            const res = await api.get(`/competitions/competitions/${id}/`);
            setCompetition(res.data);
        } catch (err) {
            console.error("Error fetching competition:", err);
            setError("Ekki tókst að sækja mótið.");
        }
        };
        fetchCompetition();
    }, [id]);

    const renderTab = () => {
        switch (activeTab) {
        case "competition":
            return <CompetitionOverview competition={competition} />;
        case "athletes":
            return <CompetitionAthletes competitionId={id} />;
        case "boulders":
            return <CompetitionBoulders competitionId={id} />;
        case "startlist":
            return <CompetitionStartlist competitionId={id} />;
        case "results":
            return <CompetitionResults competitionId={id} />;
        default:
            return null;
        }
    };

    if (error) return <p>{error}</p>;
    if (!competition) return <p>Sæki gögn...</p>;

    return(
        <>
            <div className="competition-tabs" style={{ padding: "2rem" }}>
                <h1>{competition.title}</h1>

                <div className="tab-header" style={{ marginBottom: "1rem" }}>
                    <button onClick={() => setActiveTab("competition")}>Mót</button>
                    <button onClick={() => setActiveTab("athletes")}>Keppendur</button>
                    <button onClick={() => setActiveTab("boulders")}>Leiðir</button>
                    <button onClick={() => setActiveTab("startlist")}>Ráslisti</button>
                    <button onClick={() => setActiveTab("results")}>Niðurstöður</button>
                </div>

                <div className="tab-content">{renderTab()}</div>
            </div>
        </>
    );
}

export default CompetitionDetails;