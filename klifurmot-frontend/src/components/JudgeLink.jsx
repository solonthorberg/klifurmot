import React, { useState, useEffect } from "react";
import api from "../services/api";

function JudgeLinkSection({ competitionId }) {
  const [availableJudges, setAvailableJudges] = useState([]);
  const [selectedJudge, setSelectedJudge] = useState("");
  const [expirationDate, setExpirationDate] = useState("");
  const [generatedLink, setGeneratedLink] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [existingLinks, setExistingLinks] = useState([]);
  const [isLoadingLinks, setIsLoadingLinks] = useState(true);
  const [editingLink, setEditingLink] = useState(null);

  useEffect(() => {
    fetchAvailableJudges();
    fetchExistingLinks();
    // Set default expiration to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setExpirationDate(tomorrow.toISOString().slice(0, 16)); // Format for datetime-local input
  }, []);

  const fetchAvailableJudges = async () => {
    try {
      const res = await api.get("/accounts/user-accounts/");
      setAvailableJudges(res.data);
    } catch (err) {
      console.error("Failed to fetch judges:", err);
    }
  };

  const fetchExistingLinks = async () => {
    setIsLoadingLinks(true);
    try {
      const res = await api.get(
        `/accounts/judge-links/competition/${competitionId}/`
      );
      setExistingLinks(res.data);
    } catch (err) {
      console.error("Failed to fetch existing links:", err);
      // For now, set empty array if endpoint doesn't exist
      setExistingLinks([]);
    } finally {
      setIsLoadingLinks(false);
    }
  };

  const generateJudgeLink = async () => {
    if (!selectedJudge) {
      alert("Veldu dómara fyrst");
      return;
    }

    if (!expirationDate) {
      alert("Veldu gildistíma fyrst");
      return;
    }

    setIsGenerating(true);
    try {
      const payload = {
        user_id: selectedJudge,
      };

      // Add expiration date if provided
      if (expirationDate) {
        payload.expires_at = new Date(expirationDate).toISOString();
      }

      const res = await api.post(
        `/accounts/judge-links/${competitionId}/`,
        payload
      );

      setGeneratedLink(res.data.judge_link);
      console.log("Judge link generated:", res.data.judge_link);

      // Refresh the existing links list
      await fetchExistingLinks();
    } catch (err) {
      console.error("Failed to generate judge link:", err);
      alert(
        `Ekki tókst að búa til dómaraslóð: ${
          err.response?.data?.detail || err.message
        }`
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = async (link = generatedLink) => {
    try {
      await navigator.clipboard.writeText(link);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
      // Fallback for browsers that don't support clipboard API
      const textArea = document.createElement("textarea");
      textArea.value = link;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    }
  };

  const deleteJudgeLink = async (linkId) => {
    if (!confirm("Ertu viss um að þú viljir eyða þessari dómaraslóð?")) {
      return;
    }

    try {
      // Updated URL to match the backend pattern
      await api.delete(`/accounts/judge-links/link/${linkId}/`);
      console.log("Judge link deleted");
      await fetchExistingLinks();
    } catch (err) {
      console.error("Failed to delete judge link:", err);
      alert(
        `Ekki tókst að eyða dómaraslóð: ${
          err.response?.data?.detail || err.message
        }`
      );
    }
  };

  const updateJudgeLink = async (linkId, newExpirationDate) => {
    try {
      // Updated URL to match the backend pattern
      await api.patch(`/accounts/judge-links/link/${linkId}/`, {
        expires_at: new Date(newExpirationDate).toISOString(),
      });
      console.log("Judge link updated");
      setEditingLink(null);
      await fetchExistingLinks();
    } catch (err) {
      console.error("Failed to update judge link:", err);
      alert(
        `Ekki tókst að uppfæra dómaraslóð: ${
          err.response?.data?.detail || err.message
        }`
      );
    }
  };

  const getJudgeName = (userId) => {
    const judge = availableJudges.find((j) => j.id === userId);
    return judge ? judge.full_name || judge.username : "Óþekktur notandi";
  };

  const isLinkExpired = (expiresAt) => {
    return new Date(expiresAt) < new Date();
  };

  return (
    <div className="card mb-4">
      <div className="card-header">
        <h5 className="mb-0">📋 Dómaraslóðir</h5>
      </div>
      <div className="card-body">
        {/* Create New Judge Link Section */}
        <div className="row align-items-end mb-4">
          <div className="col-md-3">
            <label className="form-label">Veldu dómara:</label>
            <select
              className="form-select"
              value={selectedJudge}
              onChange={(e) => setSelectedJudge(e.target.value)}
            >
              <option value="">-- Veldu dómara --</option>
              {availableJudges.map((judge) => (
                <option key={judge.id} value={judge.id}>
                  {judge.full_name || judge.username} ({judge.email})
                </option>
              ))}
            </select>
          </div>
          <div className="col-md-3">
            <label className="form-label">Gildistími:</label>
            <input
              type="datetime-local"
              className="form-control"
              value={expirationDate}
              onChange={(e) => setExpirationDate(e.target.value)}
              min={new Date().toISOString().slice(0, 16)} // Prevent past dates
            />
          </div>
          <div className="col-md-3">
            <button
              className="btn btn-primary"
              onClick={generateJudgeLink}
              disabled={!selectedJudge || !expirationDate || isGenerating}
            >
              {isGenerating ? "Býr til..." : "Búa til slóð"}
            </button>
          </div>
        </div>

        {generatedLink && (
          <div className="mb-4">
            <label className="form-label">Nýja dómaraslóð:</label>
            <div className="input-group">
              <input
                type="text"
                className="form-control"
                value={generatedLink}
                readOnly
              />
              <button
                className="btn btn-outline-secondary"
                onClick={() => copyToClipboard(generatedLink)}
                title="Afrita slóð"
              >
                {linkCopied ? "✅ Afritað!" : "📋 Afrita"}
              </button>
            </div>
            <small className="text-muted">
              Sendu þessa slóð til dómarans. Slóðin rennur út:{" "}
              {new Date(expirationDate).toLocaleString("is-IS")}
            </small>
          </div>
        )}

        {/* Existing Judge Links Section */}
        <div className="mt-4">
          <h6>Núverandi dómaraslóðir:</h6>
          {isLoadingLinks ? (
            <p className="text-muted">Hleður...</p>
          ) : existingLinks.length === 0 ? (
            <p className="text-muted">Engar dómaraslóðir til staðar</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>Dómari</th>
                    <th>Dómaraslóð</th>
                    <th>Rennur út</th>
                    <th>Staða</th>
                    <th>Aðgerðir</th>
                  </tr>
                </thead>
                <tbody>
                  {existingLinks.map((link) => (
                    <tr key={link.id}>
                      <td>{getJudgeName(link.user_id)}</td>
                      <td>
                        <div className="input-group input-group-sm">
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            value={link.judge_link}
                            readOnly
                            style={{ fontSize: "0.75rem" }}
                          />
                          <button
                            className="btn btn-outline-secondary btn-sm"
                            onClick={() => copyToClipboard(link.judge_link)}
                            title="Afrita slóð"
                          >
                            📋
                          </button>
                        </div>
                      </td>
                      <td>
                        {editingLink === link.id ? (
                          <div className="d-flex gap-1">
                            <input
                              type="datetime-local"
                              className="form-control form-control-sm"
                              defaultValue={new Date(link.expires_at)
                                .toISOString()
                                .slice(0, 16)}
                              onChange={(e) => {
                                link.newExpirationDate = e.target.value;
                              }}
                              min={new Date().toISOString().slice(0, 16)}
                            />
                            <button
                              className="btn btn-success btn-sm"
                              onClick={() =>
                                updateJudgeLink(link.id, link.newExpirationDate)
                              }
                              title="Vista"
                            >
                              ✅
                            </button>
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => setEditingLink(null)}
                              title="Hætta við"
                            >
                              ❌
                            </button>
                          </div>
                        ) : (
                          <div className="d-flex align-items-center gap-2">
                            <small>
                              {new Date(link.expires_at).toLocaleString(
                                "is-IS"
                              )}
                            </small>
                            <button
                              className="btn btn-sm btn-outline-primary"
                              onClick={() => setEditingLink(link.id)}
                              title="Breyta gildistíma"
                            >
                              ✏️
                            </button>
                          </div>
                        )}
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            isLinkExpired(link.expires_at)
                              ? "bg-danger"
                              : link.is_used
                              ? "bg-success"
                              : "bg-warning"
                          }`}
                        >
                          {isLinkExpired(link.expires_at)
                            ? "Útrunnin"
                            : link.is_used
                            ? "Notuð"
                            : "Virk"}
                        </span>
                      </td>
                      <td>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => deleteJudgeLink(link.id)}
                          title="Eyða slóð"
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default JudgeLinkSection;