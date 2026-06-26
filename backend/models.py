from pydantic import BaseModel, HttpUrl, field_validator
from typing import Optional, Literal
from datetime import datetime

Section = Literal["full", "pricing", "careers"]
Status  = Literal["active", "paused", "error"]
Category = Literal["Pricing", "Product/Feature", "Hiring", "Content/Messaging", "Leadership", "Other"]

class CompetitorCreate(BaseModel):
    name: str
    url: str
    section: Section = "full"
    check_interval: int = 360

    @field_validator("url")
    @classmethod
    def validate_url(cls, v: str) -> str:
        if not v.startswith(("http://", "https://")):
            v = "https://" + v
        return v.rstrip("/")

class CompetitorUpdate(BaseModel):
    name: Optional[str] = None
    section: Optional[Section] = None
    status: Optional[Status] = None
    check_interval: Optional[int] = None

class CompetitorOut(BaseModel):
    id: str
    name: str
    url: str
    section: str
    status: str
    last_checked: Optional[str]
    check_interval: int
    weekly_changes: int
    error_message: Optional[str]
    created_at: str

class ChangeOut(BaseModel):
    id: str
    competitor_id: str
    competitor_name: Optional[str]
    competitor_url: Optional[str]
    category: Optional[str]
    summary: Optional[str]
    impact_score: Optional[int]
    impact_justification: Optional[str]
    strategic_action: Optional[str]
    diff_link: Optional[str]
    is_read: bool
    crm_synced: bool
    crm_record_id: Optional[str]
    created_at: str

class SettingsIn(BaseModel):
    key: str
    value: str

class BusinessProfile(BaseModel):
    company_name: str = ""
    industry: str = ""
    target_market: str = ""
    main_differentiator: str = ""
    key_competitors_context: str = ""
    digest_email: str = ""
    digest_schedule: str = "weekly"

class OnboardingIn(BaseModel):
    profile: BusinessProfile
    notion_token: Optional[str] = None
    notion_db_id: Optional[str] = None
    airtable_token: Optional[str] = None
    airtable_base_id: Optional[str] = None
    airtable_table: Optional[str] = None
    crm_provider: Optional[str] = None
    smtp_user: Optional[str] = None
    smtp_pass: Optional[str] = None
    digest_to: Optional[str] = None
