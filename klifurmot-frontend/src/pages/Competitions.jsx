import { useEffect, useState } from 'react';
import api from "../services/api";

function Competitions() {
    const [competitions, setCompetitions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [year, setYear] = useState('');
    const [availableYears, setAvailableYears] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');

    const fetchCompetitions = async () => {
        try {
            const response = await api.get("competitions/competitions/");
            console.log(response.data);
            setCompetitions(response.data);

            const years = [...new Set(response.data.map(comp => new Date(comp.start_date).getFullYear()))];
            setAvailableYears(years.sort((a, b) => b - a));
        } 
        catch (error) {
            console.error("Error fetching competitions:", error);
        } 
        finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCompetitions();
    }, []);

    const filteredCompetitions = competitions
        .sort((a, b) => new Date(b.start_date) - new Date(a.start_date)) // Sort by newest first
        .filter(comp => {
            const matchesYear = year ? new Date(comp.start_date).getFullYear() === parseInt(year) : true;
            const matchesSearch = comp.title.toLowerCase().includes(searchQuery.toLowerCase());
            return matchesYear && matchesSearch;
        });

    return (
        <>
            <h2>Mót</h2>

            <div>
                <input type="text" placeholder="Leita af móti..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                
                <select value={year} onChange={e => setYear(e.target.value)}>
                    <option value="">All Years</option>
                    {availableYears.map(y => (
                        <option key={y} value={y}>
                            {y}
                        </option>
                    ))}
                </select>
            </div>

            {loading ? (
                <p>Hleður inn mót...</p>
            ) : filteredCompetitions.length === 0 ? (
                <p>Engin mót fundust.</p>
            ) : (
                <div>
                    {filteredCompetitions.map(comp => (
                        <div key={comp.id}>
                            {comp.image && (
                                <img src={comp.image} alt={comp.title} />
                            )}
                            <div>
                                <h5>{comp.title}</h5>
                                <p>{new Date(comp.start_date).toLocaleDateString()}</p>
                                <p>{comp.description || 'No description available.'}</p>
                            </div>
                            <div>
                                <a href={`/competitions/${comp.id}`}>Skoða nánar</a>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </>
    );
}

export default Competitions;

