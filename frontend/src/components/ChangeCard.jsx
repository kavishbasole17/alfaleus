import ScoreBadge, { catClass, relTime, scoreBorderColor } from "./ScoreBadge";

export default function ChangeCard({ change, onClick, animDelay = 0 }) {
  return (
    <div
      className={`change-card${change.is_read ? "" : " unread"}`}
      style={{ borderLeftColor: scoreBorderColor(change.impact_score), animationDelay: `${animDelay}ms` }}
      onClick={() => onClick(change)}
    >
      <ScoreBadge score={change.impact_score} />

      <div className="change-body">
        <div className="change-header">
          <span className="change-competitor">{change.competitor_name || "Unknown"}</span>
          <span className={`cat-tag ${catClass(change.category)}`}>
            {change.category || "Other"}
          </span>
          {!change.is_read && <span className="new-dot" title="Unread" />}
        </div>
        <div className="change-summary">{change.summary || "Analysis pending…"}</div>
        {change.strategic_action && (
          <div className="change-action">→ {change.strategic_action}</div>
        )}
      </div>

      <div className="change-ts">{relTime(change.created_at)}</div>
    </div>
  );
}
