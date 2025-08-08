import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { setAuthToken } from '../services/api';
import { useNotification } from '../context/NotificationContext';

export const AuthRoleContext = (competitionId = null) => {
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState(null);
  const navigate = useNavigate();
  const { showError } = useNotification();

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      navigate("/login");
      return;
    }

    setAuthToken(token);

    const checkAccess = async () => {
      try {
        // If no specific competition, check if user is global admin
        if (!competitionId) {
          const userResponse = await api.get("/accounts/me/");
          console.log("User response:", userResponse.data);
          
          if (userResponse.data.profile?.is_admin) {
            setAuthorized(true);
            setUserRole("admin");
            setLoading(false);
            return;
          }
          
          showError("Þú hefur ekki stjórnandaaðgang");
          navigate("/");
          setLoading(false);
          return;
        }

        // If specific competition, check competition roles
        const rolesResponse = await api.get(
          `/competitions/roles/?competition_id=${competitionId}`
        );
        console.log("Roles response:", rolesResponse.data);

        const hasAdminRole = rolesResponse.data.some(
          (role) => role.role === "admin"
        );

        if (hasAdminRole) {
          setAuthorized(true);
          setUserRole("admin");
          setLoading(false);
          return;
        }

        // You could also allow judges to view (read-only) if needed
        const hasJudgeRole = rolesResponse.data.some(
          (role) => role.role === "judge"
        );

        if (hasJudgeRole) {
          setAuthorized(true);
          setUserRole("judge");
          setLoading(false);
          return;
        }

        showError("Þú hefur ekki aðgang að þessu viðmóti");
        navigate("/controlpanel");
        setLoading(false);

      } catch (err) {
        console.error("Error checking access:", err);
        showError("Villa kom upp við að athuga aðgang");
        navigate("/");
        setLoading(false);
      }
    };

    checkAccess();
  }, [competitionId, navigate, showError]);

  return { authorized, loading, userRole };
};