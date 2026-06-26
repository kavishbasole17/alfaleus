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

      {/* Signals nudge */}
      {unreadCount > 0 && (
        <div className="signals-banner">
          <span className="signals-banner-dot" />
          {unreadCount} new intelligence signal{unreadCount !== 1 ? "s" : ""} since your last visit
          <Link to="/feed" className="signals-banner-link">Read Feed →</Link>
        </div>
      )}

      {/* Summary stats */}
      {competitors.length > 0 && (
        <div className="summary-row">
          {[
            { label: "Tracking",          num: competitors.length, delay: 0   },
            { label: "Changes this week", num: weekly,             delay: 55  },
            { label: "Unread alerts",     num: unreadCount,        delay: 110 },
          ].map(({ label, num, delay }) => (
            <div key={label} className="summary-card" style={{ animationDelay: `${delay}ms` }}>
              <div className="summary-label">{label}</div>
              <div className="summary-num">{num}</div>
            </div>
          ))}
        </div>
      )}

      {competitors.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🔭</div>
          <div className="empty-title">No competitors tracked yet</div>
          <div className="empty-desc">
            Add a competitor and Alfaleus will monitor their site, detect changes,
            and score the business impact using AI.
          </div>
          <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
            + Add your first competitor
          </button>
        </div>
      ) : (
        <div className="competitor-grid">
          {competitors.map((comp, i) => (
            <CompetitorCard
              key={comp.id}
              comp={comp}
              onDeleted={handleDeleted}
              animDelay={i * 50}
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
