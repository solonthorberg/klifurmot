import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import { GoogleLogin } from "@react-oauth/google";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post("accounts/login/", { email, password });
      const { token } = res.data;
      login(token);
      navigate("/profile");
    } catch (err) {
      console.error("Login error:", err.response?.data || err.message);
      alert("Innskráning mistókst. Athugaðu netfang og lykilorð.");
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
      alert("Google innskráning mistókst");
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Netfang"
          required
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Lykilorð"
          required
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
