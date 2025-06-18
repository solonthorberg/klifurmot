import React, { useState, useEffect } from "react";
import api from "../services/api";

function EditProfile({ me, onCancel, onSave }) {
  const [formData, setFormData] = useState({
    email: me.user.email || "",
    full_name: me.profile?.full_name || "",
    gender: me.profile?.gender || "",
    nationality: me.profile?.nationality || "",
    height_cm: me.profile?.height_cm || "",
    wingspan_cm: me.profile?.wingspan_cm || "",
    date_of_birth: me.profile?.date_of_birth || "",
  });

  const [countries, setCountries] = useState([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    api
      .get("accounts/countries/")
      .then((res) => setCountries(res.data))
      .catch((err) => console.error("Error loading countries:", err));
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.patch("accounts/me/", formData);
      setMessage("Upplýsingar uppfærðar!");
      onSave();
    } catch (err) {
      setMessage("Villa kom upp við uppfærslu.");
      console.error(err);
    }
  };

  return (
    <div>
      <h2>Breyta prófíl</h2>
      {message && <p>{message}</p>}
      <form onSubmit={handleSubmit}>
        <label>
          Fullt nafn:
          <input
            type="text"
            name="full_name"
            value={formData.full_name}
            onChange={handleChange}
            required
          />
        </label>

        <label>
          Netfang:
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
          />
        </label>

        <label>
          Fæðingardagur:
          <input
            type="date"
            name="date_of_birth"
            value={formData.date_of_birth}
            onChange={handleChange}
          />
        </label>

        <label>
          Kyn:
          <select
            name="gender"
            value={formData.gender}
            onChange={handleChange}
            required
          >
            <option value="">Veldu kyn</option>
            <option value="KK">KK</option>
            <option value="KVK">KVK</option>
          </select>
        </label>

        <label>
          Þjóðerni:
          <select
            name="nationality"
            value={formData.nationality}
            onChange={handleChange}
            required
          >
            <option value="">Veldu</option>
            {countries.map((c) => (
              <option key={c.country_code} value={c.country_code}>
                {c.name_en}
              </option>
            ))}
          </select>
        </label>

        <label>
          Hæð (cm):
          <input
            type="number"
            name="height_cm"
            value={formData.height_cm}
            onChange={handleChange}
          />
        </label>

        <label>
          Vænghaf (cm):
          <input
            type="number"
            name="wingspan_cm"
            value={formData.wingspan_cm}
            onChange={handleChange}
          />
        </label>

        <div style={{ marginTop: "1rem" }}>
          <button type="submit">Vista</button>
          <button
            type="button"
            onClick={onCancel}
            style={{ marginLeft: "1rem" }}
          >
            Hætta við
          </button>
        </div>
      </form>
    </div>
  );
}

export default EditProfile;
