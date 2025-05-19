import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import { GoogleLogin } from "@react-oauth/google";

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

  const handleGoogleLogin = async (credentialResponse) => {
    const idToken = credentialResponse.credential;
    try {
      const res = await api.post("accounts/google-login/", { token: idToken });
      const { token } = res.data;
      login(token);
      navigate("/profile");
    } catch (err) {
      console.error("Google login error:", err.response?.data || err.message);
      alert("Google login failed");
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
        <button type="submit">Innskrá</button>
      </form>

      <div style={{ margin: "20px 0" }}>
        <GoogleLogin onSuccess={handleGoogleLogin} onError={() => alert("Google login mistókst")} />
      </div>

      <p>
        Ertu ekki með aðgang? <a href="/register">Nýskrá</a>
      </p>
    </>
  );
}

export default Login;
