import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { api } from "../api";
import { useApp } from "../context/AppContext";

function StatusPill({ ok, label }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 500 }}>{label}</div>
      <div style={{
        display: "inline-flex", alignItems: "center", gap: 5,
        fontSize: 13, fontWeight: 600,
        color: ok ? "var(--score-low)" : "var(--text-muted)",
      }}>
        <span style={{
          width: 6, height: 6, borderRadius: "50%", flexShrink: 0,
          background: ok ? "var(--score-low)" : "var(--border-strong)",
        }} />
        {ok ? "Yes" : "No"}
      </div>
    </div>
  );
}

export default function Settings() {
  const { llmStatus } = useApp();

  const [profile,   setProfile]   = useState({ company_name: "", industry: "", target_market: "", main_differentiator: "", key_competitors_context: "" });
  const [crm,       setCrm]       = useState({ crm_provider: "notion", notion_token: "", notion_db_id: "", airtable_token: "", airtable_base_id: "", airtable_table: "Intelligence" });
  const [email,     setEmail]     = useState({ smtp_user: "", smtp_pass: "", digest_to: "" });
  const [crmStatus, setCrmStatus] = useState({});
  const [settings,  setSettings]  = useState({});

  useEffect(() => {
    api.getProfile().then(p => setProfile(prev => ({ ...prev, ...p }))).catch(() => {});
    api.getSettings().then(s => {
      setSettings(s);
      setCrm(prev => ({
        ...prev,
        crm_provider:     s.crm_provider     || "notion",
        notion_db_id:     s.notion_db_id     || "",
        airtable_base_id: s.airtable_base_id || "",
        airtable_table:   s.airtable_table   || "Intelligence",
      }));
      setEmail(prev => ({ ...prev, smtp_user: s.smtp_user || "", digest_to: s.digest_to || "" }));
    }).catch(() => {});
    api.crmStatus().then(setCrmStatus).catch(() => {});
  }, []);

  const up = (setter) => (key) => (e) => setter(s => ({ ...s, [key]: e.target.value }));

  const saveProfile = async () => {
    try { await api.saveOnboarding({ profile }); toast.success("Profile saved"); }
    catch (e) { toast.error(e.message); }
  };
  const saveCrm = async () => {
    try {
      await api.saveOnboarding({
        profile,
        crm_provider:     crm.crm_provider,
        notion_token:     crm.notion_token     || undefined,
        notion_db_id:     crm.notion_db_id     || undefined,
        airtable_token:   crm.airtable_token   || undefined,
        airtable_base_id: crm.airtable_base_id || undefined,
        airtable_table:   crm.airtable_table   || undefined,
      });
      toast.success("CRM settings saved");
    } catch (e) { toast.error(e.message); }
  };
  const saveEmail = async () => {
    try {
      await api.saveOnboarding({
        profile,
        smtp_user: email.smtp_user || undefined,
        smtp_pass: email.smtp_pass || undefined,
        digest_to: email.digest_to || undefined,
      });
      toast.success("Email settings saved");
    } catch (e) { toast.error(e.message); }
  };
  const retryFailed = async () => {
    try { await api.crmRetry(); toast.success("Retrying failed CRM syncs…"); }
    catch (e) { toast.error(e.message); }
  };

  return (
    <div className="page">
      <div className="page-header" style={{ marginBottom: 22 }}>
        <div>
          <div className="page-title">Settings</div>
          <div className="page-subtitle">Configure your intelligence system</div>
        </div>
      </div>

      {/* LLM Status */}
      {llmStatus && (
        <div className="settings-section">
          <div className="settings-section-title">AI Model</div>
          <div style={{ display: "flex", gap: 28, flexWrap: "wrap", marginBottom: 12 }}>
            <StatusPill ok={llmStatus.enabled}    label="Enabled" />
            <StatusPill ok={llmStatus.downloaded} label="Downloaded" />
            <StatusPill ok={llmStatus.ready}      label="Ready" />
          </div>
          {!llmStatus.downloaded && (
            <p style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6, marginTop: 10 }}>
              Qwen2.5-0.5B Q4 (~354 MB) is downloading in the background.
              Impact analysis uses a keyword fallback until the model is ready.
            </p>
          )}
        </div>
      )}

      {/* Business Profile */}
      <div className="settings-section" style={{ animationDelay: "40ms" }}>
        <div className="settings-section-title">Business Profile</div>
        <div className="form-row">
          <div className="form-group">
            <label>Company Name</label>
            <input value={profile.company_name} onChange={up(setProfile)("company_name")} placeholder="Your Company" />
          </div>
          <div className="form-group">
            <label>Industry</label>
            <input value={profile.industry} onChange={up(setProfile)("industry")} placeholder="SaaS, E-commerce…" />
          </div>
        </div>
        <div className="form-group">
          <label>Target Market</label>
          <input value={profile.target_market} onChange={up(setProfile)("target_market")} placeholder="SMBs in North America…" />
        </div>
        <div className="form-group">
          <label>Main Differentiator</label>
          <textarea value={profile.main_differentiator} onChange={up(setProfile)("main_differentiator")} />
        </div>
        <div className="form-group">
          <label>Key Competitors Context <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>(optional)</span></label>
          <textarea value={profile.key_competitors_context} onChange={up(setProfile)("key_competitors_context")} />
        </div>
        <button className="btn btn-primary" onClick={saveProfile}>Save Profile</button>
      </div>

      {/* CRM */}
      <div className="settings-section" style={{ animationDelay: "80ms" }}>
        <div className="settings-section-title">CRM Integration</div>

        {Object.keys(crmStatus).length > 0 && (
          <div style={{
            display: "flex", gap: 18, marginBottom: 18, padding: "10px 14px",
            background: "var(--surface)", borderRadius: 8,
            border: "1px solid var(--border)", flexWrap: "wrap", alignItems: "center",
          }}>
            {Object.entries(crmStatus).map(([status, count]) => (
              <span key={status} style={{
                fontSize: 12.5, fontWeight: 600,
                color: status === "done" ? "var(--score-low)" : status === "failed" ? "var(--score-crit)" : "var(--text-sec)",
              }}>
                {status}: {count}
              </span>
            ))}
            {crmStatus.failed > 0 && (
              <button className="btn btn-ghost btn-xs" onClick={retryFailed}>Retry failed</button>
            )}
          </div>
        )}

        <div className="form-group">
          <label>Provider</label>
          <select value={crm.crm_provider} onChange={up(setCrm)("crm_provider")}>
            <option value="notion">Notion</option>
            <option value="airtable">Airtable</option>
          </select>
        </div>

        {crm.crm_provider === "notion" && (
          <>
            <div className="form-group">
              <label>Integration Token</label>
              <input type="password" value={crm.notion_token} onChange={up(setCrm)("notion_token")} placeholder="secret_…" />
              <div className="form-hint">Current: {settings.notion_token ? "set" : "not set"}</div>
            </div>
            <div className="form-group">
              <label>Database ID</label>
              <input value={crm.notion_db_id} onChange={up(setCrm)("notion_db_id")} placeholder="32-character ID" />
            </div>
          </>
        )}

        {crm.crm_provider === "airtable" && (
          <>
            <div className="form-group">
              <label>Personal Access Token</label>
              <input type="password" value={crm.airtable_token} onChange={up(setCrm)("airtable_token")} placeholder="pat…" />
              <div className="form-hint">Current: {settings.airtable_token ? "set" : "not set"}</div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Base ID</label>
                <input value={crm.airtable_base_id} onChange={up(setCrm)("airtable_base_id")} placeholder="app…" />
              </div>
              <div className="form-group">
                <label>Table Name</label>
                <input value={crm.airtable_table} onChange={up(setCrm)("airtable_table")} />
              </div>
            </div>
          </>
        )}
        <button className="btn btn-primary" onClick={saveCrm}>Save CRM Settings</button>
      </div>

      {/* Email Digest */}
      <div className="settings-section" style={{ animationDelay: "120ms" }}>
        <div className="settings-section-title">Digest Email</div>
        <div className="form-row">
          <div className="form-group">
            <label>Send digest to</label>
            <input type="email" value={email.digest_to} onChange={up(setEmail)("digest_to")} placeholder="you@example.com" />
          </div>
          <div className="form-group">
            <label>Gmail sender address</label>
            <input type="email" value={email.smtp_user} onChange={up(setEmail)("smtp_user")} placeholder="sender@gmail.com" />
          </div>
        </div>
        <div className="form-group">
          <label>Gmail App Password</label>
          <input type="password" value={email.smtp_pass} onChange={up(setEmail)("smtp_pass")} placeholder="xxxx xxxx xxxx xxxx" />
          <div className="form-hint">
            Current: {settings.smtp_pass ? "set" : "not set"} —{" "}
            <a
              href="https://myaccount.google.com/apppasswords"
              target="_blank"
              rel="noreferrer"
              style={{ color: "var(--accent)" }}
            >
              Generate one here →
            </a>
          </div>
        </div>
        <button className="btn btn-primary" onClick={saveEmail}>Save Email Settings</button>
      </div>
    </div>
  );
}
