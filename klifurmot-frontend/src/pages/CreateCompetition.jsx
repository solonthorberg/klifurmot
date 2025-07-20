import { useNavigate, useParams } from "react-router-dom";
import { useCompetitionData } from "../hooks/UseCompetitionData";
import CompetitionForm from "../components/CompetitionManage/CompetitionForm";
import CategoryManager from "../components/CompetitionManage/CategoryManager";

import { Box, Typography, Alert, Button, Divider, Stack } from "@mui/material";

function CreateCompetition() {
  const { competitionId } = useParams();
  const navigate = useNavigate();
  const goBack = () => navigate(-1);

  const {
    formState,
    categoryState,
    loading,
    submitting,
    error,
    setFormField,
    setImage,
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

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <form onSubmit={handleSubmit}>
        <CompetitionForm
          formState={formState}
          setFormField={setFormField}
          setImage={setImage}
        />

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

        <Stack direction="row" spacing={2}>
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
            variant="contained"
            color="secondary"
            onClick={goBack}
            disabled={submitting}
          >
            Hætta við
          </Button>
        </Stack>
      </form>
    </Box>
  );
}

export default CreateCompetition;
