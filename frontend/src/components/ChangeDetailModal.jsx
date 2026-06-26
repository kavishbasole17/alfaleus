import { useEffect } from "react";
import { api } from "../api";
import ScoreBadge, { catClass, relTime, scoreBorderColor } from "./ScoreBadge";

export default function ChangeDetailModal({ change, onClose }) {
  useEffect(() => {
    api.markRead(change.id).catch(() => {});
  }, [change.id]);

  const borderColor = scoreBorderColor(change.impact_score);

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg" style={{ borderTop: `3px solid ${borderColor}` }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 22 }}>
          <ScoreBadge score={change.impact_score} size={52} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginBottom: 4, fontWeight: 500 }}>
              {change.competitor_name} · {relTime(change.created_at)}
            </div>
            <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 8, letterSpacing: "-.2px", color: "var(--text)" }}>
              {change.category || "Change"} Detected
            </div>
            <span className={`cat-tag ${catClass(change.category)}`}>
              {change.category || "Other"}
            </span>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>

        <div style={{ height: 1, background: "var(--border)", marginBottom: 20 }} />

        {change.summary && (
          <div style={{ marginBottom: 20 }}>
            <div style={sectionLabel}>Summary</div>
            <p style={bodyText}>{change.summary}</p>
          </div>
        )}

        {change.impact_justification && (
          <div style={{ marginBottom: 20 }}>
            <div style={sectionLabel}>Why this matters</div>
            <p style={{ ...bodyText, fontSize: 13.5 }}>{change.impact_justification}</p>
          </div>
        )}

        {change.strategic_action && (
          <div style={{
            background: "var(--accent-dim)",
            border: "1px solid var(--border-strong)",
            borderRadius: 8,
            padding: "14px 16px",
            marginBottom: 20,
          }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: ".5px" }}>
              Recommended Action
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", lineHeight: 1.5 }}>
              {change.strategic_action}
            </div>
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
            {change.crm_synced ? "✓ CRM synced" : "⏳ CRM pending"}
          </span>
          {change.diff_link && (
            <a
              href={change.diff_link}
              target="_blank"
              rel="noreferrer"
              style={{ fontSize: 12, color: "var(--accent)", fontWeight: 500 }}
            >
              View screenshot →
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

const sectionLabel = {
  fontSize: 11, fontWeight: 600, color: "var(--text-muted)",
  textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 7,
};
const bodyText = {
  fontSize: 14, color: "var(--text-sec)", lineHeight: 1.7,
};
