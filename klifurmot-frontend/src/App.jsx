import AppRoutes from "./routes/routes";
import Navbar from "./components/Navbar";
import "./css/App.css";
import "./css/Home.css";
import "./css/Navbar.css";

function App() {
  return (
    <>
    <Navbar />
    <AppRoutes />
    </>
  );
}

export default App

