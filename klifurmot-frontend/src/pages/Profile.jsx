import React, { useEffect, useState } from "react";
import api, { setAuthToken } from "../services/api";

function Profile() {
  const [me, setMe] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      setAuthToken(token);
    }
    api
      .get("accounts/me/")
      .then((res) => setMe(res.data))
      .catch((err) => {
        console.error("Error fetching profile:", err.response?.data || err.message);
        setMe(null);
      });
  }, []);

  if (!me) return <p>Hleður inn...</p>;

  return (
    <div>
      <h2>Welcome, {me.user.username}</h2>
      <p>Email: {me.user.email}</p>
      <p>Roles:</p>
      <ul>
        {me.roles.map((role, idx) => (
          <li key={idx}>
            {role.title} - {role.role}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default Profile;