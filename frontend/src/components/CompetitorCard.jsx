import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { api } from "../api";
import { initials, relTime } from "./ScoreBadge";

export default function CompetitorCard({ comp, onDeleted, animDelay = 0 }) {
  const navigate = useNavigate();

  const handleScrape = async (e) => {
    e.stopPropagation();
    try {
      await api.scrapeNow(comp.id);
      toast.success(`Scraping ${comp.name}…`);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDelete = async (e) => {
    e.stopPropagation();
    if (!confirm(`Delete "${comp.name}"? This removes all history.`)) return;
    try {
      await api.deleteCompetitor(comp.id);
      toast.success(`${comp.name} deleted`);
      onDeleted(comp.id);
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div
      className="competitor-card"
      style={{ animationDelay: `${animDelay}ms` }}
      onClick={() => navigate(`/competitor/${comp.id}`)}
    >
      <div className="cc-header">
        <div className="cc-avatar">{initials(comp.name)}</div>
        <div className="cc-meta">
          <div className="cc-name" title={comp.name}>{comp.name}</div>
          <div className="cc-url" title={comp.url}>
            {comp.url.replace(/^https?:\/\//, "")}
          </div>
        </div>
        <div className={`status-dot status-${comp.status}`} title={comp.status} />
      </div>

      <div className="cc-stats-row">
        <div className="cc-stat">
          <div className="stat-value">{comp.weekly_changes}</div>
          <div className="stat-label">Changes / week</div>
        </div>
        <div className="cc-stat">
          <div className="stat-value" style={{ fontSize: 13, paddingTop: 3 }}>
            {relTime(comp.last_checked)}
          </div>
          <div className="stat-label">Last checked</div>
        </div>
      </div>

      <div className="cc-footer">
        <span className="section-tag">{comp.section}</span>
        <div className="cc-actions">
          <button
            className="btn btn-ghost btn-xs"
            onClick={(e) => { e.stopPropagation(); navigate(`/competitor/${comp.id}`); }}
          >
            View
          </button>
          <button className="btn btn-ghost btn-xs" onClick={handleScrape}>Scrape</button>
          <button className="btn btn-danger btn-xs" onClick={handleDelete}>Delete</button>
        </div>
      </div>
    </div>
  );
}
