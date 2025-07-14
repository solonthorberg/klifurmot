import React, { useEffect, useState } from "react";
import api, { setAuthToken } from "../services/api";
import EditProfile from "../components/EditProfile";
import ViewProfile from "../components/ViewProfile";
import "./../css/pages/Profile.css";

function Profile() {
  const [me, setMe] = useState(null);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) setAuthToken(token);
    api
      .get("accounts/me/")
      .then((res) => {
        console.log("Profile data:", res.data);
        setMe(res.data);
      })
      .catch((err) => {
        console.error(
          "Error fetching profile:",
          err.response?.data || err.message
        );
        setMe(null);
      });
  }, [editing]);

  if (!me) return <p>Hleður inn...</p>;
  return (
    <div className="profile-container">
      {editing ? (
        <EditProfile
          me={me}
          onCancel={() => setEditing(false)}
          onSave={() => setEditing(false)}
        />
      ) : (
        <ViewProfile me={me} onEdit={() => setEditing(true)} />
      )}
    </div>
  );
}

export default Profile;
