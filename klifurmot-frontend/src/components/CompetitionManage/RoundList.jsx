import {
  DndContext,
  closestCenter,
  useSensor,
  useSensors,
  PointerSensor,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";

// SortableRoundItem component for drag and drop
function SortableRoundItem({ id, children }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      {children(listeners)}
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

  // Filter out deleted rounds for display
  const activeRounds = rounds.filter((r) => r && !r.markedForDeletion);

  console.log("🔍 RoundList filtering:", {
    totalRounds: rounds.length,
    activeRounds: activeRounds.length,
    rounds: rounds.map((r) => ({
      id: r._id,
      name: r.name,
      deleted: r.markedForDeletion,
    })),
  });

  const handleDragEnd = (event) => {
    handleDragRound(catKey, event);
  };

  if (activeRounds.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "2rem", color: "#666" }}>
        <p>Engar umferðir búnar til</p>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={activeRounds.map((r) => r._id)}
        strategy={verticalListSortingStrategy}
      >
        <div>
          {activeRounds.map((round, idx) => (
            <SortableRoundItem key={round._id} id={round._id}>
              {(listeners) => (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "0.75rem",
                    border: "1px solid #eee",
                    margin: "0.5rem 0",
                    backgroundColor: "white",
                    borderRadius: "4px",
                    cursor: "pointer",
                  }}
                >
                  {/* Drag handle and content */}
                  <div
                    style={{ display: "flex", alignItems: "center", flex: 1 }}
                    {...listeners}
                  >
                    {/* Drag handle */}
                    <div
                      style={{
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

                  {/* ✅ UPDATED: Material-UI Button components with variant="contained" */}
                  <div style={{ display: "flex", gap: "0.25rem" }}>
                    <Button
                      variant="contained"
                      color="warning"
                      size="small"
                      onClick={() =>
                        handleAddOrUpdateRound(catKey, round, "edit")
                      }
                      disabled={submitting}
                      sx={{
                        minWidth: "auto",
                        padding: "6px 8px",
                      }}
                      title="Breyta umferð"
                    >
                      <EditIcon sx={{ fontSize: "16px" }} />
                    </Button>

                    <Button
                      variant="contained"
                      color="error"
                      size="small"
                      onClick={() => handleDeleteRound(catKey, round._id)}
                      disabled={submitting}
                      sx={{
                        minWidth: "auto",
                        padding: "6px 8px",
                      }}
                      title="Eyða umferð"
                    >
                      <DeleteIcon sx={{ fontSize: "16px" }} />
                    </Button>
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
