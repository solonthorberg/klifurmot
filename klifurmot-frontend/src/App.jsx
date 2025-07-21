import React, { Fragment } from "react";
import AppRoutes from "./routes/routes";
import Navbar from "./components/Navbar";
import { Container, Box } from "@mui/material";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";

function App() {
  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
        <Navbar />
        <Container sx={{ 
          padding: 3, 
          minHeight: '100vh', // Subtract navbar height (64px is default MUI AppBar height)
          position: 'relative',
        }}>
          <AppRoutes />
        </Container>
    </LocalizationProvider>
  );
}
export default App;