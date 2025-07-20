import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import SortableItem from "../SortableItem";

function RoundList({
  rounds,
  catKey,
  submitting,
  handleAddOrUpdateRound,
  handleDeleteRound,
  handleDragRound,
}) {
  const sensors = useSensors(useSensor(PointerSensor));

  const visibleRounds = rounds.filter((r) => !r.markedForDeletion);
  const deletedRounds = rounds.filter((r) => r.markedForDeletion);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={(event) => handleDragRound(catKey, event)}
    >
      <SortableContext
        items={visibleRounds.map((r) => r._id)}
        strategy={verticalListSortingStrategy}
      >
        <div>
          {visibleRounds.length === 0 && (
            <p style={{ color: "#666", fontStyle: "italic" }}>
              Engar umferðir búnar til
            </p>
          )}

          {visibleRounds.map((round, idx) => (
            <div
              key={round._id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "0.5rem",
                border: "1px solid #eee",
                margin: "0.5rem 0",
                backgroundColor: "white",
                borderRadius: "4px",
              }}
            >
              <SortableItem id={round._id}>
                <span>
                  {round.name} – {round.athlete_count} keppendur –{" "}
                  {round.boulder_count} leiðir
                </span>
              </SortableItem>
              <div style={{ display: "flex", gap: "0.25rem" }}>
                <button
                  type="button"
                  onClick={() => handleAddOrUpdateRound(catKey, round, idx)}
                  disabled={submitting}
                  style={{
                    padding: "0.25rem 0.5rem",
                    backgroundColor: "#ffc107",
                    color: "black",
                    border: "none",
                    borderRadius: "4px",
                    cursor: submitting ? "not-allowed" : "pointer",
                    fontSize: "0.875rem",
                  }}
                >
                  Breyta
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteRound(catKey, idx)}
                  disabled={submitting}
                  style={{
                    padding: "0.25rem 0.5rem",
                    backgroundColor: "#dc3545",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: submitting ? "not-allowed" : "pointer",
                    fontSize: "0.875rem",
                  }}
                >
                  Eyða
                </button>
              </div>
            </div>
          ))}

          {deletedRounds.map((round) => (
            <div
              key={round._id}
              style={{
                color: "red",
                padding: "0.5rem",
                border: "1px solid #eee",
                margin: "0.5rem 0",
                backgroundColor: "#ffe6e6",
                borderRadius: "4px",
                opacity: 0.7,
              }}
            >
              {round.name} – {round.athlete_count} keppendur –{" "}
              {round.boulder_count} leiðir
              <span
                style={{
                  fontSize: "0.8rem",
                  fontStyle: "italic",
                  marginLeft: "1rem",
                }}
              >
                Verður eytt þegar þú vistar
              </span>
            </div>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

export default RoundList;
