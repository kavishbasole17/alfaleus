import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { api } from "../api";
import ChangeCard from "../components/ChangeCard";
import ChangeDetailModal from "../components/ChangeDetailModal";
import { initials, relTime } from "../components/ScoreBadge";

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "var(--card)",
      border: "1px solid var(--border-strong)",
      borderRadius: 8,
      padding: "9px 13px",
      fontSize: 12.5,
      boxShadow: "var(--shadow-md)",
    }}>
      <div style={{ fontWeight: 700, color: "var(--text)", marginBottom: 2 }}>
        Score: {payload[0].value}
      </div>
      <div style={{ color: "var(--text-muted)" }}>{payload[0].payload.label}</div>
    </div>
  );
};

export default function CompetitorDetail() {
  const { id }    = useParams();
  const navigate  = useNavigate();
  const [comp,    setComp]    = useState(null);
  const [changes, setChanges] = useState([]);
  const [selected,setSelected]= useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.getCompetitor(id), api.listChanges({ competitor_id: id, limit: 100 })])
      .then(([c, chs]) => { setComp(c); setChanges(chs); })
      .catch(err => toast.error(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="loading-state"><span className="spinner" /> Loading…</div>;
  if (!comp)   return <div className="page"><div className="empty-title">Not found</div></div>;

  const scored   = changes.filter(c => c.impact_score != null);
  const avgScore = scored.length
    ? (scored.reduce((a, c) => a + c.impact_score, 0) / scored.length).toFixed(1)
    : "–";
  const chartData = [...changes].reverse().map((c, i) => ({
    idx:   i + 1,
    score: c.impact_score,
    label: new Date(c.created_at).toLocaleDateString(),
  }));

  const handleScrape = async () => {
    try { await api.scrapeNow(comp.id); toast.success("Scraping…"); }
    catch (e) { toast.error(e.message); }
  };

  return (
    <div className="page">
      <button
        className="btn btn-ghost btn-sm"
        style={{ marginBottom: 18 }}
        onClick={() => navigate(-1)}
      >
        ← Back
      </button>

      {/* Header */}
      <div className="detail-header-card">
        <div className="detail-avatar">{initials(comp.name)}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-.3px", color: "var(--text)", marginBottom: 4 }}>
            {comp.name}
          </h1>
          <a
            href={comp.url}
            target="_blank"
            rel="noreferrer"
            style={{ fontSize: 12.5, color: "var(--accent)", fontWeight: 500 }}
          >
            {comp.url}
          </a>
          <div style={{ marginTop: 8, display: "flex", gap: 8, alignItems: "center" }}>
            <span className="section-tag">{comp.section}</span>
            <span className={`status-dot status-${comp.status}`} />
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{comp.status}</span>
          </div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={handleScrape}>↻ Scrape Now</button>
      </div>

      {/* Stats */}
      <div className="detail-stats">
        {[
          { value: changes.length,            label: "Total Changes", delay: 0   },
          { value: comp.weekly_changes,        label: "This Week",    delay: 50  },
          { value: avgScore,                   label: "Avg Score",    delay: 100 },
          { value: relTime(comp.last_checked), label: "Last Checked", delay: 150 },
        ].map(s => (
          <div key={s.label} className="detail-stat" style={{ animationDelay: `${s.delay}ms` }}>
            <div className="ds-value">{s.value}</div>
            <div className="ds-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Chart */}
      {chartData.length > 1 && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--text)", marginBottom: 16 }}>
            Impact Score Over Time
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={chartData} margin={{ top: 5, right: 16, bottom: 5, left: 0 }}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="idx"
                stroke="var(--border)"
                tick={{ fontSize: 11, fill: "var(--text-muted)" }}
                tickLine={false}
              />
              <YAxis
                domain={[0, 10]}
                stroke="var(--border)"
                tick={{ fontSize: 11, fill: "var(--text-muted)" }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="score"
                stroke="var(--accent)"
                strokeWidth={2}
                dot={{ fill: "var(--accent)", r: 3, strokeWidth: 0 }}
                activeDot={{ r: 5, fill: "var(--accent)", strokeWidth: 0 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", marginBottom: 12 }}>
        Change History
      </div>

      {changes.length === 0 ? (
        <div className="empty-state">
          <div className="empty-title">No changes recorded</div>
          <div className="empty-desc">Trigger a scrape above to start tracking.</div>
        </div>
      ) : (
        changes.map((ch, i) => (
          <ChangeCard key={ch.id} change={ch} onClick={setSelected} animDelay={i * 30} />
        ))
      )}

      {selected && <ChangeDetailModal change={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
