// RoundList.jsx - Fixed Drag with Drag Handle
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
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// Custom SortableItem with drag handle
function SortableRoundItem({ id, children }) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style}>
      {children({ dragHandleProps: { ...attributes, ...listeners } })}
    </div>
  );
}

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
            <SortableRoundItem key={round._id} id={round._id}>
              {({ dragHandleProps }) => (
                <div
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
                  <div
                    style={{ display: "flex", alignItems: "center", flex: 1 }}
                  >
                    {/* Drag Handle */}
                    <div
                      {...dragHandleProps}
                      style={{
                        cursor: "grab",
                        padding: "0.25rem",
                        marginRight: "0.5rem",
                        color: "#666",
                        fontSize: "1.2rem",
                        userSelect: "none",
                      }}
                    >
                      ⋮⋮
                    </div>

                    {/* Round Info */}
                    <span>
                      {round.name} – {round.athlete_count} keppendur –{" "}
                      {round.boulder_count} leiðir
                    </span>
                  </div>

                  {/* Buttons - these can now be clicked normally */}
                  <div style={{ display: "flex", gap: "0.25rem" }}>
                    <button
                      type="button"
                      onClick={() =>
                        handleAddOrUpdateRound(catKey, round, "edit")
                      }
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
              )}
            </SortableRoundItem>
          ))}

          {/* Removed deleted rounds display - they are now completely hidden */}
        </div>
      </SortableContext>
    </DndContext>
  );
}

export default RoundList;
