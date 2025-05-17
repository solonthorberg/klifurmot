import React, { useEffect, useState } from "react";
import api from "../services/api";

export default function Profile() {
  const [me, setMe] = useState(null);

  useEffect(() => {
    api
      .get("accounts/me/")
      .then((res) => setMe(res.data))
      .catch(() => setMe(null));
  }, []);

  if (!me) return <p>Loading...</p>;

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
