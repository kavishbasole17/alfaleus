const BASE = import.meta.env.VITE_API_URL || "";

async function req(method, path, body) {
  const opts = { method, headers: { "Content-Type": "application/json" } };
  if (body !== undefined) opts.body = JSON.stringify(body);
  const res = await fetch(BASE + path, opts);
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({ detail: res.statusText }));
  if (!res.ok) throw new Error(data.detail || `HTTP ${res.status}`);
  return data;
}

export const api = {
  health:           ()        => req("GET",    "/api/health"),

  listCompetitors:  ()        => req("GET",    "/api/competitors"),
  getCompetitor:    (id)      => req("GET",    `/api/competitors/${id}`),
  addCompetitor:    (d)       => req("POST",   "/api/competitors", d),
  updateCompetitor: (id, d)   => req("PUT",    `/api/competitors/${id}`, d),
  deleteCompetitor: (id)      => req("DELETE", `/api/competitors/${id}`),
  scrapeNow:        (id)      => req("POST",   `/api/competitors/${id}/scrape`),

  listChanges:  (p = {}) => {
    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries(p).filter(([, v]) => v != null && v !== ""))
    );
    return req("GET", `/api/changes?${qs}`);
  },
  getChange:    (id)  => req("GET",   `/api/changes/${id}`),
  markRead:     (id)  => req("PATCH", `/api/changes/${id}/read`),
  markAllRead:  ()    => req("PATCH", "/api/changes/mark-all-read"),
  unreadCount:  ()    => req("GET",   "/api/changes/unread-count"),

  getSettings:     ()  => req("GET",  "/api/settings"),
  getProfile:      ()  => req("GET",  "/api/settings/profile"),
  saveOnboarding:  (d) => req("POST", "/api/settings/onboarding", d),
  onboardingStatus:()  => req("GET",  "/api/settings/onboarding-status"),

  crmStatus: ()        => req("GET",  "/api/crm/status"),
  crmRetry:  ()        => req("POST", "/api/crm/retry"),
  crmSync:   (id)      => req("POST", `/api/crm/sync/${id}`),
};
