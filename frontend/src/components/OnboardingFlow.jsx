import { useState } from "react";
import toast from "react-hot-toast";
import { api } from "../api";

const STEPS = ["Business Profile", "CRM Integration", "Digest Email"];

export default function OnboardingFlow({ onComplete }) {
  const [step,    setStep]    = useState(0);
  const [loading, setLoading] = useState(false);

  const [profile, setProfile] = useState({
    company_name: "", industry: "", target_market: "",
    main_differentiator: "", key_competitors_context: "",
  });
  const [crm, setCrm] = useState({
    provider: "", notion_token: "", notion_db_id: "",
    airtable_token: "", airtable_base_id: "",
  });
  const [email, setEmail] = useState({ smtp_user: "", smtp_pass: "", digest_to: "" });

  const up = (setter) => (key) => (e) => setter(s => ({ ...s, [key]: e.target.value }));

  const next = () => {
    if (step === 0 && !profile.company_name.trim()) {
      toast.error("Company name is required");
      return;
    }
    if (step < 2) { setStep(s => s + 1); return; }
    finish();
  };

  const finish = async () => {
    setLoading(true);
    try {
      await api.saveOnboarding({
        profile,
        crm_provider:     crm.provider        || undefined,
        notion_token:     crm.notion_token     || undefined,
        notion_db_id:     crm.notion_db_id     || undefined,
        airtable_token:   crm.airtable_token   || undefined,
        airtable_base_id: crm.airtable_base_id || undefined,
        smtp_user:        email.smtp_user || undefined,
        smtp_pass:        email.smtp_pass || undefined,
        digest_to:        email.digest_to || undefined,
      });
      onComplete();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fillWidth = step === 0 ? "2%" : step === 1 ? "50%" : "100%";

  return (
    <div className="onboarding-overlay">
      <div className="onboarding-card">
        <div className="ob-logo">
          alfa<span className="logo-accent">leus</span>
        </div>
        <div className="ob-subtitle">Competitor Intelligence, Automated.</div>

        {/* Progress bar */}
        <div className="step-progress">
          <div className="step-labels">
            {STEPS.map((s, i) => (
              <div
                key={i}
                className={`step-label-item${i === step ? " active" : i < step ? " done" : ""}`}
              >
                {s}
              </div>
            ))}
          </div>
          <div className="step-track">
            <div className="step-fill" style={{ width: fillWidth }} />
          </div>
        </div>

        {/* Step 0 */}
        {step === 0 && (
          <div className="fade-in">
            <div className="ob-step-title">Your Business</div>
            <div className="ob-step-desc">
              This helps the AI understand your competitive context and score changes accurately.
            </div>
            <div className="form-group">
              <label>Company Name *</label>
              <input
                value={profile.company_name}
                onChange={up(setProfile)("company_name")}
                placeholder="Your Company"
                autoFocus
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Industry</label>
                <input value={profile.industry} onChange={up(setProfile)("industry")} placeholder="SaaS, E-commerce…" />
              </div>
              <div className="form-group">
                <label>Target Market</label>
                <input value={profile.target_market} onChange={up(setProfile)("target_market")} placeholder="SMBs in North America" />
              </div>
            </div>
            <div className="form-group">
              <label>What makes you different?</label>
              <textarea
                value={profile.main_differentiator}
                onChange={up(setProfile)("main_differentiator")}
                placeholder="We're the only tool that…"
              />
            </div>
          </div>
        )}

        {/* Step 1 */}
        {step === 1 && (
          <div className="fade-in">
            <div className="ob-step-title">CRM Integration</div>
            <div className="ob-step-desc">
              Push detected changes to Notion or Airtable automatically. You can skip this.
            </div>
            <div className="form-group">
              <label>Provider</label>
              <select value={crm.provider} onChange={up(setCrm)("provider")}>
                <option value="">Skip for now</option>
                <option value="notion">Notion</option>
                <option value="airtable">Airtable</option>
              </select>
            </div>
            {crm.provider === "notion" && (
              <>
                <div className="form-group">
                  <label>Integration Token</label>
                  <input type="password" value={crm.notion_token} onChange={up(setCrm)("notion_token")} placeholder="secret_…" />
                </div>
                <div className="form-group">
                  <label>Database ID</label>
                  <input value={crm.notion_db_id} onChange={up(setCrm)("notion_db_id")} placeholder="32-character ID" />
                </div>
              </>
            )}
            {crm.provider === "airtable" && (
              <>
                <div className="form-group">
                  <label>Personal Access Token</label>
                  <input type="password" value={crm.airtable_token} onChange={up(setCrm)("airtable_token")} placeholder="pat…" />
                </div>
                <div className="form-group">
                  <label>Base ID</label>
                  <input value={crm.airtable_base_id} onChange={up(setCrm)("airtable_base_id")} placeholder="app…" />
                </div>
              </>
            )}
          </div>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <div className="fade-in">
            <div className="ob-step-title">Weekly Digest</div>
            <div className="ob-step-desc">
              Get a Monday morning summary of everything your competitors changed. Needs a Gmail App Password.
            </div>
            <div className="form-group">
              <label>Send digest to</label>
              <input type="email" value={email.digest_to} onChange={up(setEmail)("digest_to")} placeholder="you@example.com" />
            </div>
            <div className="form-group">
              <label>Gmail sender address</label>
              <input type="email" value={email.smtp_user} onChange={up(setEmail)("smtp_user")} placeholder="sender@gmail.com" />
            </div>
            <div className="form-group">
              <label>Gmail App Password</label>
              <input type="password" value={email.smtp_pass} onChange={up(setEmail)("smtp_pass")} placeholder="xxxx xxxx xxxx xxxx" />
              <div className="form-hint">
                <a
                  href="https://myaccount.google.com/apppasswords"
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: "var(--accent)" }}
                >
                  Generate at myaccount.google.com/apppasswords →
                </a>
              </div>
            </div>
          </div>
        )}

        <div className="ob-nav">
          <button
            className="btn btn-ghost"
            onClick={() => setStep(s => s - 1)}
            style={{ visibility: step > 0 ? "visible" : "hidden" }}
          >
            ← Back
          </button>
          <button className="btn btn-primary" onClick={next} disabled={loading}>
            {loading
              ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Saving…</>
              : step === 2 ? "Get Started →" : "Continue →"}
          </button>
        </div>
      </div>
    </div>
  );
}
