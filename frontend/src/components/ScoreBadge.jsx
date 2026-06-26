export function scoreClass(score) {
  if (!score) return "score-none";
  if (score <= 3) return "score-low";
  if (score <= 6) return "score-med";
  if (score <= 8) return "score-high";
  return "score-crit";
}

export function scoreBorderColor(score) {
  if (!score) return "var(--border-strong)";
  if (score <= 3) return "var(--score-low)";
  if (score <= 6) return "var(--score-med)";
  if (score <= 8) return "var(--score-high)";
  return "var(--score-crit)";
}

export function catClass(cat) {
  const map = {
    "Pricing":           "cat-Pricing",
    "Product/Feature":   "cat-ProductFeature",
    "Hiring":            "cat-Hiring",
    "Content/Messaging": "cat-ContentMessaging",
    "Leadership":        "cat-Leadership",
    "Other":             "cat-Other",
  };
  return map[cat] || "cat-Other";
}

export function relTime(iso) {
  if (!iso) return "Never";
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60)  return "just now";
  const m = Math.floor(s / 60);
  if (m < 60)  return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7)   return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function initials(name) {
  return (name || "?").split(/\s+/).map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

export default function ScoreBadge({ score, size = 44 }) {
  return (
    <div
      className={`score-badge ${scoreClass(score)}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.38) }}
    >
      {score ?? "–"}
    </div>
  );
}
