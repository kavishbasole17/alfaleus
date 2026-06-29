import { useEffect } from "react";
import { api } from "../api";
import ScoreBadge, { catClass, relTime, scoreBorderColor } from "./ScoreBadge";

const FALLBACK_PHRASES = [
  "llm analysis unavailable",
  "llm offline",
  "llm_enabled",
  "default score",
  "model is downloaded",
  "keyword fallback",
  "review the change manually",
  "analysis unavailable",
];

function isFallback(text) {
  if (!text) return true;
  const t = text.toLowerCase();
  return FALLBACK_PHRASES.some(p => t.includes(p));
}

export default function ChangeDetailModal({ change, onClose }) {
  useEffect(() => {
    api.markRead(change.id).catch(() => {});
  }, [change.id]);

  const borderColor      = scoreBorderColor(change.impact_score);
  const hasSummary       = !isFallback(change.summary);
  const hasJustification = !isFallback(change.impact_justification);
  const hasAction        = !isFallback(change.strategic_action);
  const hasRealAnalysis  = hasSummary || hasJustification || hasAction;

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg" style={{ borderTop: `3px solid ${borderColor}` }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 22 }}>
          <ScoreBadge score={change.impact_score} size={52} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={meta}>
              {change.competitor_name}&nbsp;&middot;&nbsp;{relTime(change.created_at)}
            </div>
            <div style={title}>
              {change.category || "Change"} Detected
            </div>
            <span className={`cat-tag ${catClass(change.category)}`}>
              {change.category || "Other"}
            </span>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ flexShrink: 0 }}>
            ✕
          </button>
        </div>

        <div style={{ height: 1, background: "var(--border)", marginBottom: 20 }} />

        {hasRealAnalysis ? (
          <>
            {hasSummary && (
              <div style={{ marginBottom: 20 }}>
                <div style={sectionLabel}>Summary</div>
                <p style={bodyText}>{change.summary}</p>
              </div>
            )}

            {hasJustification && (
              <div style={{ marginBottom: 20 }}>
                <div style={sectionLabel}>Why this matters</div>
                <p style={{ ...bodyText, fontSize: 13.5 }}>{change.impact_justification}</p>
              </div>
            )}

            {hasAction && (
              <div style={actionBox}>
                <div style={sectionLabel}>Recommended Action</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", lineHeight: 1.55 }}>
                  {change.strategic_action}
                </div>
              </div>
            )}
          </>
        ) : (
          <div style={{ padding: "24px 0 8px" }}>
            <div style={{ fontSize: 14, color: "var(--text-muted)", lineHeight: 1.6 }}>
              AI analysis has not run yet for this change.
            </div>
          </div>
        )}

        {change.diff_link && (
          <div style={{ marginTop: 20 }}>
            <a
              href={change.diff_link}
              target="_blank"
              rel="noreferrer"
              style={{ fontSize: 12, color: "var(--accent)", fontWeight: 500 }}
            >
              View screenshot →
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

const meta = {
  fontSize: 11, color: "var(--text-muted)", marginBottom: 4,
  fontWeight: 600, letterSpacing: ".5px", textTransform: "uppercase",
};
const title = {
  fontSize: 17, fontWeight: 700, marginBottom: 8,
  letterSpacing: "-.3px", color: "var(--text)",
};
const sectionLabel = {
  fontSize: 10, fontWeight: 700, color: "var(--text-muted)",
  textTransform: "uppercase", letterSpacing: ".8px", marginBottom: 8,
};
const bodyText = {
  fontSize: 14, color: "var(--text-sec)", lineHeight: 1.72,
};
const actionBox = {
  background: "var(--accent-dim)",
  border: "1px solid var(--border-strong)",
  borderRadius: 8,
  padding: "14px 16px",
  marginBottom: 20,
};
