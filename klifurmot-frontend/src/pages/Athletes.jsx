import { useEffect, useState } from 'react';
import api from "../services/api";

function Athletes() {
    const [athletes, setAthletes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('')

    const fetchAthletes = async () => {
        try {
            const response = await api.get("athletes/climbers");
            setAthletes(response.data);
        } catch (error) {
            console.error("Error fetching athletes:", error);
        } finally {
            setLoading(false);
        }
    };
    useEffect(() => {
        fetchAthletes();
    }, []);

    const filteredAthletes = athletes.filter(climber => {
        const matchesSearch = climber.full_name.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesSearch;
    })

    return (
        <>
            <h2>Keppendur</h2>
            <div>
                <input type="text" placeholder="Leita af keppanda..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}/>
            </div>
            {loading ? (
                <p>Hleður inn keppendur...</p>
            ) : filteredAthletes.length === 0 ? (
                <p>Engir keppendur fundust.</p>
            ) : (
                <div>
                    {filteredAthletes.map(climber => (
                        <div key={climber.id}>
                            <div>
                                <h5>{climber.full_name}</h5>
                                <p>{climber.date_of_birth}</p>
                            </div>
                            <div>
                                <a href={`/athletes/climbers${climber.id}`}>Skoða nánar</a>
                            </div>
                        </div>
                        
                    ))}
                </div>
            )}
        </>
    )
}

export default Athletes;