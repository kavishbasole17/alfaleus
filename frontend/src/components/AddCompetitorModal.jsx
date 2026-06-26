import { useState } from "react";
import toast from "react-hot-toast";
import { api } from "../api";

export default function AddCompetitorModal({ onClose, onSaved }) {
  const [name,     setName]     = useState("");
  const [url,      setUrl]      = useState("");
  const [section,  setSection]  = useState("full");
  const [interval, setInterval] = useState(360);
  const [loading,  setLoading]  = useState(false);

  const handleSave = async () => {
    if (!name.trim() || !url.trim()) { toast.error("Name and URL are required"); return; }
    setLoading(true);
    try {
      await api.addCompetitor({ name: name.trim(), url: url.trim(), section, check_interval: Number(interval) });
      toast.success(`${name} added — running first scrape`);
      onSaved();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-title">Track a Competitor</div>

        <div className="form-group">
          <label>Competitor Name *</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Acme Corp"
            autoFocus
          />
        </div>
        <div className="form-group">
          <label>URL *</label>
          <input
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="https://acmecorp.com"
          />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Section to Monitor</label>
            <select value={section} onChange={e => setSection(e.target.value)}>
              <option value="full">Full Page</option>
              <option value="pricing">Pricing</option>
              <option value="careers">Careers</option>
            </select>
          </div>
          <div className="form-group">
            <label>Check Interval (minutes)</label>
            <input
              type="number"
              value={interval}
              min={60}
              onChange={e => setInterval(e.target.value)}
            />
            <div className="form-hint">Minimum 60. 360 = every 6 hours.</div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose} disabled={loading}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={loading}>
            {loading
              ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Adding…</>
              : "Add Competitor"}
          </button>
        </div>
      </div>
    </div>
  );
}
