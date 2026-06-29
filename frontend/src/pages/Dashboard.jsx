import { useState } from "react";
import { Link } from "react-router-dom";
import { useApp } from "../context/AppContext";
import CompetitorCard from "../components/CompetitorCard";
import AddCompetitorModal from "../components/AddCompetitorModal";

export default function Dashboard() {
  const { competitors, unreadCount, refreshCompetitors, setCompetitors } = useApp();
  const [showAdd, setShowAdd] = useState(false);

  const handleDeleted = (id) => setCompetitors(prev => prev.filter(c => c.id !== id));
  const weekly = competitors.reduce((s, c) => s + (c.weekly_changes || 0), 0);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">Dashboard</div>
          <div className="page-subtitle">
            {competitors.length === 0
              ? "No competitors tracked yet"
              : `${competitors.length} competitor${competitors.length !== 1 ? "s" : ""} tracked`}
          </div>
        </div>
      </div>

      {unreadCount > 0 && (
        <div className="signals-banner">
          <span className="signals-banner-dot" />
          {unreadCount} new signal{unreadCount !== 1 ? "s" : ""} since your last visit
          <Link to="/feed" className="signals-banner-link">View Feed →</Link>
        </div>
      )}

      {competitors.length > 0 && (
        <div className="stat-strip">
          {[
            { label: "Tracking",          num: competitors.length },
            { label: "Changes This Week", num: weekly             },
            { label: "Unread Alerts",     num: unreadCount        },
          ].map(({ label, num }) => (
            <div key={label} className="stat-strip-item">
              <div className="stat-strip-label">{label}</div>
              <div className="stat-strip-num">{num}</div>
            </div>
          ))}
        </div>
      )}

      {competitors.length === 0 ? (
        <div className="empty-state">
          <div className="empty-title">No competitors tracked yet</div>
          <div className="empty-desc">
            Add a competitor and Alfaleus will monitor their site, detect changes,
            and score the business impact using AI.
          </div>
          <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
            Add your first competitor
          </button>
        </div>
      ) : (
        <div className="competitor-grid">
          {competitors.map((comp, i) => (
            <CompetitorCard
              key={comp.id}
              comp={comp}
              onDeleted={handleDeleted}
              animDelay={i * 45}
            />
          ))}
        </div>
      )}

      {showAdd && (
        <AddCompetitorModal
          onClose={() => setShowAdd(false)}
          onSaved={() => { setShowAdd(false); refreshCompetitors(); }}
        />
      )}
    </div>
  );
}
