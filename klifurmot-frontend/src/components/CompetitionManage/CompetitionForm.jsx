import {
  Box,
  TextField,
  FormControlLabel,
  Switch,
  Typography,
  Card,
  CardContent,
  Button,
  styled,
  IconButton,
} from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import DeleteIcon from "@mui/icons-material/Delete";
import ImageIcon from "@mui/icons-material/Image";
import dayjs from "dayjs";
import { MobileDateTimePicker } from "@mui/x-date-pickers/MobileDateTimePicker";

const VisuallyHiddenInput = styled("input")({
  clip: "rect(0 0 0 0)",
  clipPath: "inset(50%)",
  height: 1,
  overflow: "hidden",
  position: "absolute",
  bottom: 0,
  left: 0,
  whiteSpace: "nowrap",
  width: 1,
});

function CompetitionForm({ formState, setFormField, setImage, deleteImage }) {
  const {
    title,
    currentImageUrl,
    startDate,
    endDate,
    location,
    description,
    visible,
    image,
  } = formState;

  const startDateValue = startDate ? dayjs(startDate) : null;
  const endDateValue = endDate ? dayjs(endDate) : null;

  const handleStartDateChange = (newValue) => {
    const dateString = newValue ? newValue.format("YYYY-MM-DDTHH:mm") : "";
    setFormField("startDate", dateString);
  };

  const handleEndDateChange = (newValue) => {
    const dateString = newValue ? newValue.format("YYYY-MM-DDTHH:mm") : "";
    setFormField("endDate", dateString);
  };

  const getImageName = (imageUrl) => {
    if (!imageUrl) return null;
    const parts = imageUrl.split("/");
    return parts[parts.length - 1];
  };

  const handleDeleteImage = () => {
    if (deleteImage) {
      deleteImage();
    }
  };

  const currentImageName = getImageName(currentImageUrl);
  const hasCurrentImage = currentImageUrl && !image;

  return (
    <Card>
      <CardContent>
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 2,
          }}
        >
          <TextField
            fullWidth
            required
            label="Titill"
            value={title}
            onChange={(e) => setFormField("title", e.target.value)}
            variant="outlined"
            placeholder="T.d. Íslandsmeistaramót (ár)"
          />

          <TextField
            fullWidth
            required
            label="Staðsetning"
            value={location}
            onChange={(e) => setFormField("location", e.target.value)}
            variant="outlined"
            placeholder="T.d. Klifurhúsið - Ármúli 21/23"
          />

          <MobileDateTimePicker
            label="Byrjunardagur og tími *"
            value={startDateValue}
            onChange={handleStartDateChange}
            format="DD/MM/YYYY HH:mm"
            ampm={false}
            slotProps={{
              textField: {
                fullWidth: true,
                variant: "outlined",
                required: true,
              },
            }}
          />

          <MobileDateTimePicker
            label="Lokadagur og tími *"
            value={endDateValue}
            onChange={handleEndDateChange}
            format="DD/MM/YYYY HH:mm"
            ampm={false}
            minDateTime={startDateValue}
            slotProps={{
              textField: {
                fullWidth: true,
                variant: "outlined",
                required: true,
              },
            }}
          />

          <TextField
            fullWidth
            multiline
            rows={6}
            label="Upplýsingar"
            value={description}
            onChange={(e) => setFormField("description", e.target.value)}
            variant="outlined"
            placeholder="Lýstu mótinu, skráningu, reglum, verðlaunum og öðrum mikilvægum upplýsingum..."
          />

          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Typography variant="h6" align="center">
              Mynd
            </Typography>

            {hasCurrentImage && (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 1,
                }}
              >
                <ImageIcon color="action" />
                <Typography>{currentImageName || "Núverandi mynd"}</Typography>
                <IconButton
                  onClick={handleDeleteImage}
                  color="error"
                  size="small"
                  title="Eyða mynd"
                >
                  <DeleteIcon />
                </IconButton>
              </Box>
            )}

            {image && (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 1,
                }}
              >
                <ImageIcon color="success" />
                <Typography color="success.main">{`Ný mynd: ${image.name}`}</Typography>
                <IconButton
                  onClick={() => setImage(null)}
                  color="error"
                  size="small"
                  title="Afturkalla val"
                >
                  <DeleteIcon />
                </IconButton>
              </Box>
            )}

            <Box sx={{ display: "flex", justifyContent: "center" }}>
              <Button
                component="label"
                role={undefined}
                variant="contained"
                tabIndex={-1}
                startIcon={<CloudUploadIcon />}
                size="medium"
              >
                {hasCurrentImage ? "Breyta mynd" : "Velja mynd"}
                <VisuallyHiddenInput
                  type="file"
                  accept="image/*"
                  onChange={(e) => setImage(e.target.files[0])}
                />
              </Button>
            </Box>
          </Box>

          <FormControlLabel
            control={
              <Switch
                checked={visible}
                onChange={(e) => setFormField("visible", e.target.checked)}
                color="primary"
              />
            }
            label={
              <Box>
                <Typography variant="body1">Birta mót á vefsíðu</Typography>
                <Typography variant="caption" color="textSecondary">
                  Þegar kveikt geta allir séð mótið á forsíðu og í mótalista
                </Typography>
              </Box>
            }
          />
        </Box>
      </CardContent>
    </Card>
  );
}

export default CompetitionForm;
