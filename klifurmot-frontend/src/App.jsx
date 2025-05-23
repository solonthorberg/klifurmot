import Navbar from "./components/Navbar";
import "./css/App.css";
import "./css/Home.css";
import "./css/Navbar.css";
import AppRoutes from "./routes/routes";

function App() {
  return (
    <>
    <Navbar />
    <AppRoutes />
    </>
  );
}

export default App

