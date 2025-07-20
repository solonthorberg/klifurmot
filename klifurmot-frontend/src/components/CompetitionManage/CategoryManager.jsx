// CategoryManager.jsx - Using Flex Layout (No Stack)
import {
  Card,
  CardContent,
  Typography,
  Button,
  Box,
  Chip,
  Divider,
  Alert,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import RoundList from "./RoundList";
import RoundModal from "./RoundModal";
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
    (cat) => !(cat.markedForDeletion && !cat.existingId)
  );

  const getDraftCounts = () => {
    const totalRounds = categories.reduce((acc, cat) => {
      if (cat.markedForDeletion) return acc;
      return acc + cat.rounds.filter((r) => !r.markedForDeletion).length;
    }, 0);

    const draftRounds = categories.reduce((acc, cat) => {
      if (cat.markedForDeletion) return acc;
      return (
        acc +
        cat.rounds.filter((r) => !r.markedForDeletion && !r.existingId).length
      );
    }, 0);

    const draftCategories = categories.filter(
      (cat) => !cat.markedForDeletion && !cat.existingId
    ).length;

    return { totalRounds, draftRounds, draftCategories };
  };

  const { totalRounds, draftRounds, draftCategories } = getDraftCounts();

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {/* Header with button */}
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setShowCategoryModal(true)}
              disabled={submitting}
            >
              Flokkur
            </Button>
          </Box>

          {/* Categories content */}
          {visibleCategories.length === 0 ? (
            <Box
              sx={{
                textAlign: "center",
                py: 6,
                color: "text.secondary",
              }}
            >
              <Typography variant="h6" gutterBottom>
                Engir flokkar skráðir
              </Typography>
              <Typography variant="body2">
                Byrjaðu á að búa til flokk fyrir keppendur
              </Typography>
            </Box>
          ) : (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
              {visibleCategories.map((cat) => (
                <Card
                  key={cat.key}
                  variant="outlined"
                  sx={{
                    opacity: cat.markedForDeletion ? 0.7 : 1,
                    bgcolor: cat.markedForDeletion
                      ? "error.light"
                      : "background.paper",
                  }}
                >
                  <CardContent>
                    <Box
                      sx={{ display: "flex", flexDirection: "column", gap: 2 }}
                    >
                      {/* Category header */}
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <Box>
                          <Typography variant="h6">{cat.name}</Typography>

                          {!cat.markedForDeletion && (
                            <Typography variant="body2" color="text.secondary">
                              {
                                cat.rounds.filter((r) => !r.markedForDeletion)
                                  .length
                              }{" "}
                              umferðir
                            </Typography>
                          )}
                        </Box>

                        <Box sx={{ display: "flex", gap: 1 }}>
                          {cat.markedForDeletion ? (
                            <Chip
                              label="Verður eytt við vistun"
                              color="error"
                              variant="outlined"
                            />
                          ) : (
                            <>
                              <Button
                                size="small"
                                variant="outlined"
                                startIcon={<AddIcon />}
                                onClick={() =>
                                  handleAddOrUpdateRound(cat.key, null, "open")
                                }
                                disabled={submitting}
                              >
                                Umferð
                              </Button>

                              <Button
                                size="small"
                                variant="outlined"
                                color="error"
                                onClick={() => handleDeleteCategory(cat.key)}
                                disabled={submitting}
                              >
                                <DeleteIcon />
                              </Button>
                            </>
                          )}
                        </Box>
                      </Box>

                      {/* Rounds list */}
                      {!cat.markedForDeletion && (
                        <>
                          <Divider />
                          <RoundList
                            rounds={cat.rounds}
                            catKey={cat.key}
                            submitting={submitting}
                            handleAddOrUpdateRound={handleAddOrUpdateRound}
                            handleDeleteRound={handleDeleteRound}
                            handleDragRound={handleDragRound}
                          />
                        </>
                      )}
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Box>
          )}
        </Box>

        {/* Round Modal */}
        {visibleCategories.some(
          (cat) => cat.roundsModal && !cat.markedForDeletion
        ) &&
          (() => {
            const modalCategory = visibleCategories.find(
              (cat) => cat.roundsModal
            );
            return modalCategory ? (
              <RoundModal
                existingRound={modalCategory.roundToEdit}
                onClose={() =>
                  handleAddOrUpdateRound(modalCategory.key, null, "close")
                }
                onSelectRound={(round) =>
                  handleAddOrUpdateRound(modalCategory.key, round, "save")
                }
              />
            ) : null;
          })()}

        {/* Category Modal */}
        {showCategoryModal && (
          <CategoryModal
            show={showCategoryModal}
            onClose={() => setShowCategoryModal(false)}
            onSelectCategory={handleAddCategory}
          />
        )}
      </CardContent>
    </Card>
  );
}

export default CategoryManager;
