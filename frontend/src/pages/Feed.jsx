import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import { api } from "../api";
import { useApp } from "../context/AppContext";
import ChangeCard from "../components/ChangeCard";
import ChangeDetailModal from "../components/ChangeDetailModal";
import TopSignal from "../components/TopSignal";

const CATEGORIES = ["Pricing", "Product/Feature", "Hiring", "Content/Messaging", "Leadership", "Other"];

export default function Feed() {
  const { competitors, refreshUnread } = useApp();
  const [changes,    setChanges]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [selected,   setSelected]   = useState(null);
  const [filterComp, setFilterComp] = useState("");
  const [filterCat,  setFilterCat]  = useState("");
  const [unreadOnly, setUnreadOnly] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setChanges(await api.listChanges({
        competitor_id: filterComp || null,
        category:      filterCat  || null,
        unread_only:   unreadOnly  || null,
      }));
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [filterComp, filterCat, unreadOnly]);

  useEffect(() => { load(); }, [load]);

  const markAllRead = async () => {
    await api.markAllRead().catch(() => {});
    setChanges(prev => prev.map(c => ({ ...c, is_read: true })));
    refreshUnread();
  };

  const handleClick = (ch) => {
    setSelected(ch);
    setChanges(prev => prev.map(c => c.id === ch.id ? { ...c, is_read: true } : c));
    refreshUnread();
  };

  const handleTopRead = (id) => {
    setChanges(prev => prev.map(c => c.id === id ? { ...c, is_read: true } : c));
    refreshUnread();
  };

  const unread = changes.filter(c => !c.is_read).length;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">Intelligence Feed</div>
          <div className="page-subtitle">
            {unread > 0 ? `${unread} unread` : `${changes.length} total`}
          </div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={markAllRead}>
          Mark all read
        </button>
      </div>

      {/* Top Signal hero — surfaces the highest-impact unread change */}
      {!loading && <TopSignal changes={changes} onRead={handleTopRead} />}

      {/* Filters */}
      <div className="feed-filters">
        <select className="filter-select" value={filterComp} onChange={e => setFilterComp(e.target.value)}>
          <option value="">All Competitors</option>
          {competitors.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select className="filter-select" value={filterCat} onChange={e => setFilterCat(e.target.value)}>
          <option value="">All Categories</option>
          {CATEGORIES.map(c => <option key={c}>{c}</option>)}
        </select>
        <label className="filter-checkbox">
          <input type="checkbox" checked={unreadOnly} onChange={e => setUnreadOnly(e.target.checked)} />
          Unread only
        </label>
      </div>

      {loading ? (
        <div className="loading-state"><span className="spinner" /> Loading…</div>
      ) : changes.length === 0 ? (
        <div className="empty-state">
          <div className="empty-title">Nothing here yet</div>
          <div className="empty-desc">
            Changes will appear after the next scrape. Trigger one manually from a competitor card.
          </div>
        </div>
      ) : (
        changes.map((ch, i) => (
          <ChangeCard key={ch.id} change={ch} onClick={handleClick} animDelay={i * 35} />
        ))
      )}

      {selected && <ChangeDetailModal change={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
