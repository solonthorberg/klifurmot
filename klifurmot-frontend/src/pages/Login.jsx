import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";

function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post("accounts/login/", { username, password });
      const { token } = res.data;
      login(token); 
      navigate("/profile");
    } catch (err) {
      console.error("Login error:", err.response?.data || err.message);
      alert("Invalid credentials");
    }
  };

  return (
    <>
    <form onSubmit={handleSubmit}>
      <input
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        placeholder="notendanafn eða netfang"
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="lykilorð"
      />
      <button type="submit">Login</button>
    </form>
    <p>Ertu ekki með aðgang? <a href="/register">Nýskrá</a></p>
    </>
  );
}

export default Login;
