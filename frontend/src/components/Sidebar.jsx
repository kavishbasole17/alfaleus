import { useState } from "react";
import { NavLink } from "react-router-dom";
import { useApp } from "../context/AppContext";
import AddCompetitorModal from "./AddCompetitorModal";

/* ── SVG Icons ─────────────────────────────────────────────── */
function IconGrid({ filled }) {
  return filled ? (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <rect x="3" y="3" width="7" height="7" rx="1.5"/>
      <rect x="14" y="3" width="7" height="7" rx="1.5"/>
      <rect x="3" y="14" width="7" height="7" rx="1.5"/>
      <rect x="14" y="14" width="7" height="7" rx="1.5"/>
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1.5"/>
      <rect x="14" y="3" width="7" height="7" rx="1.5"/>
      <rect x="3" y="14" width="7" height="7" rx="1.5"/>
      <rect x="14" y="14" width="7" height="7" rx="1.5"/>
    </svg>
  );
}

function IconFeed({ filled }) {
  return filled ? (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <rect x="4" y="5"  width="16" height="2.5" rx="1.25"/>
      <rect x="4" y="11" width="16" height="2.5" rx="1.25"/>
      <rect x="4" y="17" width="10" height="2.5" rx="1.25"/>
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
      <line x1="4" y1="6"  x2="20" y2="6"/>
      <line x1="4" y1="12" x2="20" y2="12"/>
      <line x1="4" y1="18" x2="14" y2="18"/>
    </svg>
  );
}

function IconSettings({ filled }) {
  return filled ? (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path fillRule="evenodd" clipRule="evenodd" d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm-6 4a6 6 0 1 1 12 0 6 6 0 0 1-12 0z"/>
      <path fillRule="evenodd" clipRule="evenodd" d="M10.363 2.13a2 2 0 0 1 3.274 0l.53.76a2 2 0 0 0 2.475.727l.866-.37a2 2 0 0 1 2.671 1.95l-.048.933a2 2 0 0 0 1.464 1.96l.906.254a2 2 0 0 1 .955 3.133l-.576.73a2 2 0 0 0 0 2.466l.576.73a2 2 0 0 1-.955 3.134l-.906.253a2 2 0 0 0-1.464 1.96l.048.934a2 2 0 0 1-2.671 1.949l-.866-.37a2 2 0 0 0-2.475.726l-.53.761a2 2 0 0 1-3.274 0l-.53-.761a2 2 0 0 0-2.474-.726l-.866.37a2 2 0 0 1-2.672-1.95l.048-.933a2 2 0 0 0-1.463-1.96l-.906-.253a2 2 0 0 1-.956-3.134l.577-.73a2 2 0 0 0 0-2.465l-.577-.73a2 2 0 0 1 .956-3.134l.906-.253a2 2 0 0 0 1.463-1.96L4.82 5.197a2 2 0 0 1 2.672-1.95l.865.37a2 2 0 0 0 2.475-.726l.53-.761z"/>
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  );
}

function IconPlus() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19"/>
      <line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  );
}

const NAV = [
  { to: "/",         label: "Dashboard",        Icon: IconGrid },
  { to: "/feed",     label: "Intelligence Feed", Icon: IconFeed, badge: true },
  { to: "/settings", label: "Settings",          Icon: IconSettings },
];

export default function Sidebar() {
  const { unreadCount, llmStatus, refreshCompetitors } = useApp();
  const [showAdd, setShowAdd] = useState(false);

  const llmReady   = llmStatus?.ready;
  const llmLoading = llmStatus?.downloaded && !llmStatus?.ready;
  const dotClass   = llmReady ? "ok" : llmLoading ? "loading" : "err";
  const dotLabel   = llmReady ? "LLM ready" : llmLoading ? "Loading model" : "Downloading model";

  return (
    <>
      <nav className="sidebar">
        {/* Wordmark */}
        <div className="sidebar-logo">
          <div className="sidebar-wordmark">
            alfa<span className="logo-accent">leus</span>
          </div>
          <div className="sidebar-tagline">Competitor Intelligence</div>
        </div>

        {/* Nav */}
        <div className="sidebar-nav">
          {NAV.map(({ to, label, Icon, badge }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}
            >
              {({ isActive }) => (
                <>
                  <span className="nav-icon">
                    <Icon filled={isActive} />
                  </span>
                  <span className="nav-label">{label}</span>
                  {badge && unreadCount > 0 && (
                    <span className="nav-badge">{unreadCount > 99 ? "99+" : unreadCount}</span>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </div>

        {/* Add Competitor CTA */}
        <div className="sidebar-cta">
          <button className="sidebar-add-btn" onClick={() => setShowAdd(true)}>
            <span style={{ display: "flex", width: 22, height: 22 }}><IconPlus /></span>
            Add Competitor
          </button>
        </div>

        {/* Footer */}
        <div className="sidebar-footer">
          <div className="llm-pill">
            <span className={`llm-dot ${dotClass}`} />
            {dotLabel}
          </div>
        </div>
      </nav>

      {showAdd && (
        <AddCompetitorModal
          onClose={() => setShowAdd(false)}
          onSaved={() => { setShowAdd(false); refreshCompetitors(); }}
        />
      )}
    </>
  );
}
