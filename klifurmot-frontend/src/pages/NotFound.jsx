import { Box, Typography, Button } from "@mui/material";
import { useNavigate } from "react-router-dom";

function NotFound() {
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        textAlign: "center",
        mt: 8,
        px: 2,
      }}
    >
      <Typography variant="h1" sx={{ fontSize: "6rem", mb: 2 }}>
        404
      </Typography>

      <Typography variant="h5" sx={{ mb: 4 }}>
        Síða fannst ekki
      </Typography>

      <Button variant="contained" onClick={() => navigate("/")} size="large">
        heimasíða
      </Button>
    </Box>
  );
}

export default NotFound;
