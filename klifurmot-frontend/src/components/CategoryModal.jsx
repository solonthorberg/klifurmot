import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import api from "../services/api";

function CategoryModal({ show, onClose, onSelectCategory }) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!show) return;

    const fetchCategories = async () => {
      try {
        const res = await api.get("/competitions/category-groups/");
        setCategories(res.data);
        console.log("📡 Fetched category groups:", res.data);
      } catch (err) {
        console.error(" Failed to fetch category groups:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, [show]);

  if (!show || !document.body) return null;

  return createPortal(
    <div
      className="custom-modal"
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
    >
      <div
        className="custom-modal-content"
        style={{
          backgroundColor: "white",
          padding: "2rem",
          borderRadius: "8px",
          width: "90%",
          maxWidth: "400px",
          maxHeight: "80vh",
          overflow: "auto",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1rem",
          }}
        >
          <h4 style={{ margin: 0 }}>Veldu flokk</h4>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              fontSize: "1.5rem",
              cursor: "pointer",
              color: "#666",
            }}
          >
            ×
          </button>
        </div>

        {loading ? (
          <p>Hleður flokkum...</p>
        ) : (
          <div>
            {categories.length === 0 ? (
              <p>Engir flokkar fundust.</p>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.5rem",
                }}
              >
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => {
                      console.log("🟢 Selected category:", cat);
                      onSelectCategory({
                        id: cat.id,
                        name: cat.name,
                        is_default: cat.is_default || false,
                      });
                    }}
                    style={{
                      padding: "0.75rem",
                      backgroundColor: "#f8f9fa",
                      border: "1px solid #dee2e6",
                      borderRadius: "4px",
                      cursor: "pointer",
                      textAlign: "left",
                      transition: "background-color 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.backgroundColor = "#e9ecef";
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = "#f8f9fa";
                    }}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div style={{ marginTop: "1rem", textAlign: "right" }}>
          <button
            onClick={onClose}
            style={{
              padding: "0.5rem 1rem",
              backgroundColor: "#6c757d",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            Loka
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default CategoryModal;
