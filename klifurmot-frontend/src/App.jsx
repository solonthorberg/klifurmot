import AppRoutes from "./routes/routes";
import Navbar from "./components/Navbar";
import { Container } from "@mui/material";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";

function App() {
  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Navbar />
      <Container sx={{ padding: 3 }}>
        <AppRoutes />
      </Container>
    </LocalizationProvider>
  );
}

export default App;
