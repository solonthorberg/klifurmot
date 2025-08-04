import { useNavigate, useParams } from "react-router-dom";
import { useCompetitionData } from "../hooks/UseCompetitionData";
import CompetitionForm from "../components/CompetitionManage/CompetitionForm";
import CategoryManager from "../components/CompetitionManage/CategoryManager";
import { Box, Typography, Alert, Button, Divider } from "@mui/material";

function CreateCompetition() {
  const { competitionId } = useParams();
  const navigate = useNavigate();

  const handleCancel = (e) => {
    e.preventDefault();
    e.stopPropagation();
    navigate("/controlpanel");
  };

  const {
    formState,
    categoryState,
    loading,
    submitting,
    error,
    setFormField,
    setImage,
    deleteImage,
    setShowCategoryModal,
    setError,
    handleAddCategory,
    handleAddOrUpdateRound,
    handleDeleteCategory,
    handleDeleteRound,
    handleDragRound,
    handleSubmit,
  } = useCompetitionData({ competitionId });

  if (loading) {
    return <Typography>Hleður mótsupplýsingum...</Typography>;
  }

  return (
    <Box sx={{ padding: 2 }}>
      <Typography variant="h5" gutterBottom>
        {competitionId ? `Breyta móti: ${formState.title}` : "Búa til nýtt mót"}
      </Typography>

      <form onSubmit={handleSubmit}>
        <CompetitionForm
          formState={formState}
          setFormField={setFormField}
          setImage={setImage}
          deleteImage={deleteImage}
        />

        <Typography variant="h5" gutterBottom sx={{ mt: 4 }}>
          Flokkar og Umferðir
        </Typography>

        <CategoryManager
          categories={categoryState}
          setShowCategoryModal={setShowCategoryModal}
          showCategoryModal={formState.showCategoryModal}
          setError={setError}
          submitting={submitting}
          handleAddCategory={handleAddCategory}
          handleAddOrUpdateRound={handleAddOrUpdateRound}
          handleDeleteCategory={handleDeleteCategory}
          handleDeleteRound={handleDeleteRound}
          handleDragRound={handleDragRound}
        />

        <Divider sx={{ my: 4 }} />

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <Box
          sx={{
            display: "flex",
            flexDirection: "row",
            gap: 2,
            justifyContent: "center",
          }}
        >
          <Button
            variant="contained"
            color="success"
            type="submit"
            disabled={submitting}
          >
            {submitting
              ? competitionId
                ? "Vista breytingar..."
                : "Vista mót..."
              : competitionId
              ? "Vista breytingar"
              : "Vista mót"}
          </Button>

          <Button
            variant="outlined"
            color="error"
            type="button"
            onClick={handleCancel}
            disabled={submitting}
          >
            Hætta við
          </Button>
        </Box>
      </form>
    </Box>
  );
}

export default CreateCompetition;
