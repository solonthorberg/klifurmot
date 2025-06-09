import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import api from "../services/api";

function CategoryModal({ onClose, onSelectCategory }) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await api.get("/competitions/category-groups/");
        setCategories(res.data);
        console.log(res.data);
      } catch (err) {
        console.error("Failed to fetch category groups:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

  return createPortal(
    <div className="custom-modal">
      <div className="custom-modal-content">
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
    </div>,
    document.body
  );
}

export default CategoryModal;
