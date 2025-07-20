function CompetitionForm({ formState, setFormField, setImage }) {
  const {
    title,
    currentImageUrl,
    startDate,
    endDate,
    location,
    description,
    visible,
    image,
    isEditMode,
  } = formState;

  return (
    <>
      <div style={{ marginBottom: "1rem" }}>
        <label style={{ display: "block", marginBottom: "0.5rem" }}>
          Titill: *
          <input
            type="text"
            value={title}
            onChange={(e) => setFormField("title", e.target.value)}
            required
            style={{
              width: "100%",
              padding: "0.5rem",
              marginTop: "0.25rem",
              border: "1px solid #ccc",
              borderRadius: "4px",
            }}
          />
        </label>
      </div>

      <div style={{ marginBottom: "1rem" }}>
        <label style={{ display: "block", marginBottom: "0.5rem" }}>
          Mynd:
          {isEditMode && currentImageUrl && (
            <div style={{ marginBottom: "0.5rem" }}>
              <img
                src={currentImageUrl}
                alt="Current"
                style={{
                  width: "200px",
                  height: "120px",
                  objectFit: "cover",
                  borderRadius: "4px",
                }}
              />
              <p
                style={{
                  fontSize: "0.9rem",
                  color: "#666",
                  margin: "0.25rem 0",
                }}
              >
                Núverandi mynd
              </p>
            </div>
          )}
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setImage(e.target.files[0])}
            style={{
              width: "100%",
              padding: "0.5rem",
              marginTop: "0.25rem",
              border: "1px solid #ccc",
              borderRadius: "4px",
            }}
          />
          {image && (
            <p
              style={{
                fontSize: "0.9rem",
                color: "#333",
                margin: "0.25rem 0",
              }}
            >
              Ný mynd valin: {image.name}
            </p>
          )}
        </label>
      </div>

      <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
        <div style={{ flex: 1 }}>
          <label style={{ display: "block", marginBottom: "0.5rem" }}>
            Byrjunardag: *
            <input
              type="datetime-local"
              value={startDate}
              onChange={(e) => setFormField("startDate", e.target.value)}
              required
              style={{
                width: "100%",
                padding: "0.5rem",
                marginTop: "0.25rem",
                border: "1px solid #ccc",
                borderRadius: "4px",
              }}
            />
          </label>
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ display: "block", marginBottom: "0.5rem" }}>
            Lokadagur: *
            <input
              type="datetime-local"
              value={endDate}
              onChange={(e) => setFormField("endDate", e.target.value)}
              required
              style={{
                width: "100%",
                padding: "0.5rem",
                marginTop: "0.25rem",
                border: "1px solid #ccc",
                borderRadius: "4px",
              }}
            />
          </label>
        </div>
      </div>

      <div style={{ marginBottom: "1rem" }}>
        <label style={{ display: "block", marginBottom: "0.5rem" }}>
          Staðsetning: *
          <input
            type="text"
            value={location}
            onChange={(e) => setFormField("location", e.target.value)}
            required
            style={{
              width: "100%",
              padding: "0.5rem",
              marginTop: "0.25rem",
              border: "1px solid #ccc",
              borderRadius: "4px",
            }}
          />
        </label>
      </div>

      <div style={{ marginBottom: "1rem" }}>
        <label style={{ display: "block", marginBottom: "0.5rem" }}>
          Lýsing:
          <textarea
            value={description}
            onChange={(e) => setFormField("description", e.target.value)}
            rows={4}
            style={{
              width: "100%",
              padding: "0.5rem",
              marginTop: "0.25rem",
              border: "1px solid #ccc",
              borderRadius: "4px",
              resize: "vertical",
            }}
          />
        </label>
      </div>

      <div style={{ marginBottom: "1rem" }}>
        <label style={{ display: "flex", alignItems: "center" }}>
          <input
            type="checkbox"
            checked={visible}
            onChange={(e) => setFormField("visible", e.target.checked)}
            style={{ marginRight: "0.5rem" }}
          />
          Birta keppni á vefsíðu
        </label>
      </div>
    </>
  );
}

export default CompetitionForm;
