import { useNavigate } from "react-router-dom";
import { initials } from "./ScoreBadge";

function ringClass(weeklyChanges) {
  if (!weeklyChanges || weeklyChanges === 0) return "ring-none";
  if (weeklyChanges <= 2) return "ring-low";
  if (weeklyChanges <= 5) return "ring-mid";
  return "ring-hot";
}

function ringLabel(weeklyChanges) {
  if (!weeklyChanges || weeklyChanges === 0) return "No changes";
  if (weeklyChanges === 1) return "1 change";
  return `${weeklyChanges} changes`;
}

export default function ActivityRings({ competitors }) {
  const navigate = useNavigate();

  if (!competitors || competitors.length === 0) return null;

  return (
    <div className="activity-strip-wrap">
      <div className="activity-strip-label">Competitor Activity</div>
      <div className="activity-strip">
        {competitors.map((comp, i) => (
          <button
            key={comp.id}
            className={`ring-item`}
            style={{ animationDelay: `${i * 45}ms` }}
            onClick={() => navigate(`/competitor/${comp.id}`)}
            title={`${comp.name} — ${ringLabel(comp.weekly_changes)}`}
          >
            <div className={`ring-outer ${ringClass(comp.weekly_changes)}`}>
              <div className="ring-avatar">{initials(comp.name)}</div>
            </div>
            {comp.weekly_changes > 0 && (
              <div className="ring-count-badge">{comp.weekly_changes}</div>
            )}
            <span className="ring-name">{comp.name.split(" ")[0]}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
