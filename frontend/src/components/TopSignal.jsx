import { useState } from "react";
import { scoreBorderColor, catClass, relTime } from "./ScoreBadge";
import ChangeDetailModal from "./ChangeDetailModal";

function scoreColor(score) {
  if (!score) return "var(--text-muted)";
  if (score <= 3) return "var(--score-low)";
  if (score <= 6) return "var(--score-med)";
  if (score <= 8) return "var(--score-high)";
  return "var(--score-crit)";
}

function scoreBg(score) {
  if (!score) return undefined;
  if (score <= 3) return "rgba(34,211,238,.04)";
  if (score <= 6) return "rgba(251,191,36,.04)";
  if (score <= 8) return "rgba(251,146,60,.04)";
  return "rgba(248,113,113,.05)";
}

export default function TopSignal({ changes, onRead }) {
  const [selected, setSelected] = useState(null);

  const unread = changes.filter(c => !c.is_read);
  if (unread.length === 0) return null;

  const top = unread.reduce(
    (best, c) => (c.impact_score ?? 0) > (best.impact_score ?? 0) ? c : best,
    unread[0]
  );

  const color      = scoreColor(top.impact_score);
  const borderClr  = scoreBorderColor(top.impact_score);
  const bg         = scoreBg(top.impact_score);

  const open = () => {
    setSelected(top);
    onRead?.(top.id);
  };

  return (
    <>
      <div
        className="top-signal"
        style={{ borderLeftColor: borderClr, background: bg }}
        onClick={open}
        role="button"
        tabIndex={0}
        onKeyDown={e => e.key === "Enter" && open()}
      >
        <div className="signal-eyebrow">
          <span className="signal-pulse" style={{ background: color }} />
          Top Signal &nbsp;·&nbsp; {unread.length} unread alert{unread.length !== 1 ? "s" : ""}
        </div>

        <div className="signal-layout">
          <div className="signal-content">
            {top.category && (
              <span className={`signal-cat cat-tag ${catClass(top.category)}`}>
                {top.category}
              </span>
            )}
            <div className="signal-competitor">{top.competitor_name}</div>

            {top.summary && (
              <p className="signal-summary">{top.summary}</p>
            )}

            {top.strategic_action && (
              <div className="signal-action">
                <span className="signal-arrow" style={{ color }}>→</span>
                {top.strategic_action}
              </div>
            )}
          </div>

          <div className="signal-score-block">
            <div className="signal-score-num" style={{ color }}>
              {top.impact_score ?? "–"}
            </div>
            <div className="signal-score-denom">/ 10</div>
          </div>
        </div>

        <div className="signal-footer">
          <span className="signal-time">{relTime(top.created_at)}</span>
          <span className="signal-cta" style={{ color }}>
            Read full signal →
          </span>
        </div>
      </div>

      {selected && (
        <ChangeDetailModal change={selected} onClose={() => setSelected(null)} />
      )}
    </>
  );
}
