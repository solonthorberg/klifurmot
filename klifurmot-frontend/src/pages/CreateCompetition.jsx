import { useNavigate, useParams } from "react-router-dom";
import { AuthRoleContext } from "../context/AuthRoleContext";
import { useCompetitionData } from "../hooks/UseCompetitionData";
import CompetitionForm from "../components/CompetitionManage/CompetitionForm";
import CategoryManager from "../components/CompetitionManage/CategoryManager";
import { 
  Box, 
  Typography, 
  Alert, 
  Button, 
  Divider, 
  Container, 
  CircularProgress,
  Chip
} from "@mui/material";

function CreateCompetition() {
  const { competitionId } = useParams();
  const navigate = useNavigate();
  const isEditing = !!competitionId;

  // Authentication hook - for editing check competition-specific roles, for creating check global admin
  const { authorized, loading: authLoading, userRole } = AuthRoleContext(isEditing ? competitionId : null);

  const {
    formState,
    categoryState,
    loading: dataLoading,
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

  // Combined loading state
  const isLoading = authLoading || dataLoading;

  const handleCancel = (e) => {
    e.preventDefault();
    e.stopPropagation();
    navigate("/controlpanel");
  };

  // Loading state - show while checking authorization or loading data
  if (isLoading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: "60vh",
            flexDirection: "column",
            gap: 2,
          }}
        >
          <CircularProgress size={48} />
          <Typography variant="h6" color="text.secondary">
            {authLoading 
              ? "Athuga aðgang..." 
              : isEditing 
                ? "Hleður keppnisbreytingu..." 
                : "Hleður keppnisgerð..."
            }
          </Typography>
        </Box>
      </Container>
    );
  }

  // If not authorized, return null (AuthRoleContext handles redirect)
  if (!authorized) return null;

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header with role badge */}
      <Box sx={{ mb: 4 }}>
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            justifyContent: "space-between",
            alignItems: { xs: "flex-start", sm: "center" },
            gap: 2,
            mb: 3,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Typography variant="h4" component="h1" fontWeight="bold">
              {isEditing ? `Breyta móti: ${formState.title}` : "Búa til nýtt mót"}
            </Typography>
            <Chip
              label="Stjórnandi"
              color="primary"
              variant="outlined"
              size="medium"
            />
          </Box>
        </Box>
      </Box>

      {/* Main form content */}
      <Box sx={{ padding: 2 }}>
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

      {/* Admin access info */}
      <Alert
        severity="info"
        sx={{
          borderRadius: 2,
          mt: 4,
          "& .MuiAlert-message": {
            width: "100%",
          },
        }}
      >
        <Typography variant="body2">
          <Box component="span" fontWeight="bold">
            Stjórnandaaðgangur:
          </Box>{" "}
          {isEditing 
            ? "Þú hefur aðgang til að breyta þessari keppni." 
            : "Þú hefur aðgang til að búa til nýjar keppnir."
          }
        </Typography>
      </Alert>
    </Container>
  );
}

export default CreateCompetition;