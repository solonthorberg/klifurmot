import { useState, useEffect } from "react";
import api from "../services/api";
import CategoryModal from "./CategoryModal";
import RoundModal from "./RoundModal";

function CreateCompetition({ goBack, refreshCompetitions }) {
  const [title, setTitle] = useState("");
  const [image, setImage] = useState(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [visible, setVisible] = useState(false);

  const [categories, setCategories] = useState([]);
  const [showCategoryModal, setShowCategoryModal] = useState(false);

  const handleAddCategory = (categoryGroup) => {
    // add selected category group with empty rounds
    setCategories([...categories, { ...categoryGroup, rounds: [] }]);
    setShowCategoryModal(false);
  };

  const handleAddRound = (categoryIndex, round) => {
    const updated = [...categories];
    updated[categoryIndex].rounds.push(round);
    setCategories(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const formData = new FormData();
      formData.append("title", title);
      if (image) formData.append("image", image);
      formData.append("start_date", startDate);
      formData.append("end_date", endDate);
      formData.append("location", location);
      formData.append("information", description);
      formData.append("is_visible", visible);

      const res = await api.post("/competitions/competitions/", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      // You may need to send categories/rounds in separate follow-up calls
      // Or wait until that backend support is ready.

      await refreshCompetitions();
      goBack();
    } catch (err) {
      console.error("Failed to create competition:", err);
    }
  };

  return (
    <div>
      <button onClick={goBack}>← Til baka</button>
      <h3>Búa til nýtt mót</h3>

      <form onSubmit={handleSubmit}>
        <label>
          Titill:
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>

        <label>
          Mynd:
          <input type="file" accept="image/*" onChange={(e) => setImage(e.target.files[0])} />
        </label>

        <label>
          Dagsetning:
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </label>

        <label>
          Staðsetning:
          <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} />
        </label>

        <label>
          Upplýsingar:
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} />
        </label>

        <label>
          <input type="checkbox" checked={visible} onChange={(e) => setVisible(e.target.checked)} />
          Birta keppni á vefsíðu
        </label>

        <hr />

        <button type="button" onClick={() => setShowCategoryModal(true)}>+ Flokkur</button>

        {categories.map((cat, idx) => (
          <div key={idx}>
            <h4>{cat.name}</h4>
            <button type="button" onClick={() => cat.roundsModal = true}>+ Umferð</button>

            <ul>
              {cat.rounds.map((round, rIdx) => (
                <li key={rIdx}>{round.name}</li>
              ))}
            </ul>

            <RoundModal
              show={cat.roundsModal}
              onClose={() => {
                const updated = [...categories];
                updated[idx].roundsModal = false;
                setCategories(updated);
              }}
              onSelectRound={(round) => handleAddRound(idx, round)}
            />
          </div>
        ))}

        <br />
        <button type="submit">Vista mót</button>
      </form>

      {showCategoryModal && (
        <CategoryModal
          onClose={() => setShowCategoryModal(false)}
          onSelectCategory={handleAddCategory}
        />
      )}
    </div>
  );
}

export default CreateCompetition;