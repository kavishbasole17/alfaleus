import { useState } from "react";
import { NavLink } from "react-router-dom";
import { useApp } from "../context/AppContext";
import AddCompetitorModal from "./AddCompetitorModal";

function IconGrid({ filled }) {
  return filled ? (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <rect x="3" y="3" width="7" height="7" rx="1.5"/>
      <rect x="14" y="3" width="7" height="7" rx="1.5"/>
      <rect x="3" y="14" width="7" height="7" rx="1.5"/>
      <rect x="14" y="14" width="7" height="7" rx="1.5"/>
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
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
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <line x1="4" y1="6"  x2="20" y2="6"/>
      <line x1="4" y1="12" x2="20" y2="12"/>
      <line x1="4" y1="18" x2="14" y2="18"/>
    </svg>
  );
}

function IconSettings({ filled }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={filled ? "2" : "1.6"} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  );
}

const NAV = [
  { to: "/",         label: "Dashboard",        Icon: IconGrid },
  { to: "/feed",     label: "Intelligence Feed", Icon: IconFeed, badge: true },
  { to: "/settings", label: "Settings",          Icon: IconSettings },
];

export default function Sidebar() {
  const { unreadCount, refreshCompetitors } = useApp();
  const [showAdd, setShowAdd] = useState(false);

  return (
    <>
      <nav className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-wordmark">
            alfa<span className="logo-accent">leus</span>
          </div>
          <div className="sidebar-tagline">Competitor Intelligence</div>
        </div>

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
                  <span className="nav-icon"><Icon filled={isActive} /></span>
                  <span className="nav-label">{label}</span>
                  {badge && unreadCount > 0 && (
                    <span className="nav-badge">{unreadCount > 99 ? "99+" : unreadCount}</span>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </div>

        <div className="sidebar-cta">
          <button className="sidebar-add-btn" onClick={() => setShowAdd(true)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Add Competitor
          </button>
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
