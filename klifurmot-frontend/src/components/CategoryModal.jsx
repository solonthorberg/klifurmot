import { useEffect, useState } from "react";
import api from "../services/api";

function CategoryModal({ onClose, onSelectCategory }) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await api.get("/competitions/category-groups/");
        setCategories(res.data);
      } catch (err) {
        console.error("Failed to fetch category groups:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

  return (
    <div className="modal">
      <div className="modal-content">
        <h4>Veldu flokk</h4>
        <button onClick={onClose}>Loka</button>
        {loading ? (
          <p>Hleður flokkum...</p>
        ) : (
          <ul>
            {categories.map((cat) => (
              <li key={cat.id}>
                <button onClick={() => onSelectCategory(cat)}>{cat.name}</button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default CategoryModal;
