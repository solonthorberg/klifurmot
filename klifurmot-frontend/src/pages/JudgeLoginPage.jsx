// JudgeLoginPage.jsx
import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import api, { setAuthToken } from '../services/api';

function JudgeLoginPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [judgeInfo, setJudgeInfo] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [judgeEmail, setJudgeEmail] = useState('');
  const [loggedInUserId, setLoggedInUserId] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    api.get(`/accounts/judge-links/${token}/`)
      .then(res => {
        setJudgeInfo(res.data);
        setLoading(false);
      })
      .catch(() => {
        setError("Slóðin er ógild eða útrunnin.");
        setLoading(false);
      });
  }, [token]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      setAuthToken(token);
      api.get("accounts/me/")
        .then(res => {
          setLoggedInUserId(res.data.user.id);
          setJudgeEmail(res.data.user.email);
          setIsAuthenticated(true);
        })
        .catch(() => {
          setIsAuthenticated(false);
          localStorage.removeItem("token");
          setAuthToken(null);
        })
        .finally(() => {
          setCheckingAuth(false);
        });
    } else {
      setCheckingAuth(false);
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      localStorage.removeItem("token");
      setAuthToken(null);

      const res = await api.post("accounts/login/", { email, password });
      const authToken = res.data.token;
      localStorage.setItem("token", authToken);
      setAuthToken(authToken);

      const me = await api.get("accounts/me/");
      setLoggedInUserId(me.data.user.id);
      setJudgeEmail(me.data.user.email);
      setIsAuthenticated(true);
      setError(null);
    } catch (err) {
      setError("Innskráning mistókst. Athugaðu netfang og lykilorð.");
      setIsAuthenticated(false);
    }
  };


  const handleAccept = () => {
    // Save judgeInfo to localStorage for later verification
    localStorage.setItem("judgeInfo", JSON.stringify(judgeInfo));

    navigate(`/judge/competition/${judgeInfo.competition_id}/judge-dashboard`);
  };

  if (loading || checkingAuth) return <p>Hleður...</p>;
  if (error && !isAuthenticated) return <div><p style={{ color: 'red' }}>{error}</p>{renderLoginForm()}</div>;

  const isCorrectJudge = isAuthenticated && loggedInUserId === judgeInfo.user_id;

  function renderLoginForm() {
    return (
      <div>
        <h2>Innskráning fyrir dómara</h2>
        <p>Þú hefur verið boðin(n) sem dómari á "{judgeInfo.competition_title}".</p>

        <form onSubmit={handleLogin}>
          <label>Netfang:
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
          </label>
          <br />
          <label>Lykilorð:
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
          </label>
          <br />
          <button type="submit">Innskrá</button>
        </form>
      </div>
    );
  }

  if (!isCorrectJudge) {
    return renderLoginForm();
  }

  return (
    <div>
      <h2>Þú ert skráð(ur) inn sem {judgeEmail}</h2>
      <p>
        Þú hefur verið boðin(n) sem dómari á <strong>{judgeInfo.competition_title}</strong>.
      </p>
      <button onClick={handleAccept}>Samþykkja</button>
    </div>
  );
}

export default JudgeLoginPage;
