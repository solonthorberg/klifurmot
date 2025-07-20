import RoundList from "./RoundList";
import RoundModal from "../RoundModal";
import CategoryModal from "./CategoryModal";

function CategoryManager({
  categories,
  showCategoryModal,
  setShowCategoryModal,
  submitting,
  setError,
  handleAddCategory,
  handleAddOrUpdateRound,
  handleDeleteCategory,
  handleDeleteRound,
  handleDragRound,
}) {
  const visibleCategories = categories.filter(
    (cat) => !(cat.markedForDeletion && !cat.existingCategories?.length)
  );

  return (
    <div style={{ marginBottom: "2rem" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1rem",
        }}
      >
        <h4>Flokkar og Umferðir</h4>
        <button
          type="button"
          onClick={() => setShowCategoryModal(true)}
          disabled={submitting}
          style={{
            padding: "0.5rem 1rem",
            backgroundColor: "#28a745",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: submitting ? "not-allowed" : "pointer",
          }}
        >
          + Flokkur
        </button>
      </div>

      {visibleCategories.length === 0 && (
        <p
          style={{
            fontStyle: "italic",
            color: "#666",
            textAlign: "center",
            padding: "2rem",
          }}
        >
          Engir flokkar skráðir. Smelltu á "+ Flokkur" til að byrja.
        </p>
      )}

      {visibleCategories.map((cat) => (
        <div
          key={cat.key}
          style={{
            border: "1px solid #ddd",
            padding: "1rem",
            margin: "1rem 0",
            borderRadius: "4px",
            backgroundColor: cat.markedForDeletion ? "#ffe6e6" : "#f8f9fa",
            opacity: cat.markedForDeletion ? 0.7 : 1,
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
            <h5 style={{ margin: 0 }}>{cat.name}</h5>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              {cat.markedForDeletion ? (
                <span style={{ color: "red", fontStyle: "italic" }}>
                  Verður eytt þegar þú vistar
                </span>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      handleAddOrUpdateRound(cat.key, null, "open")
                    }
                    disabled={submitting}
                    style={{
                      padding: "0.25rem 0.5rem",
                      backgroundColor: "#007bff",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      cursor: submitting ? "not-allowed" : "pointer",
                    }}
                  >
                    + Umferð
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteCategory(cat.key)}
                    disabled={submitting}
                    style={{
                      padding: "0.25rem 0.5rem",
                      backgroundColor: "#dc3545",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      cursor: submitting ? "not-allowed" : "pointer",
                    }}
                  >
                    🗑️ Eyða flokki
                  </button>
                </>
              )}
            </div>
          </div>

          {!cat.markedForDeletion && (
            <RoundList
              rounds={cat.rounds}
              catKey={cat.key}
              submitting={submitting}
              handleAddOrUpdateRound={handleAddOrUpdateRound}
              handleDeleteRound={handleDeleteRound}
              handleDragRound={handleDragRound}
            />
          )}

          {cat.roundsModal && !cat.markedForDeletion && (
            <RoundModal
              existingRound={cat.roundToEdit}
              onClose={() => handleAddOrUpdateRound(cat.key, null, "close")}
              onSelectRound={(round) =>
                handleAddOrUpdateRound(cat.key, round, "save")
              }
            />
          )}
        </div>
      ))}

      {showCategoryModal && (
        <CategoryModal
          show={showCategoryModal}
          onClose={() => setShowCategoryModal(false)}
          onSelectCategory={handleAddCategory}
        />
      )}
    </div>
  );
}

export default CategoryManager;
