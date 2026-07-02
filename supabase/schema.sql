-- ============================================================
-- TalentOS MVP — Supabase PostgreSQL Schema
-- Run this in Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── PROFILES (extends Supabase auth.users) ──────────────────
CREATE TABLE profiles (
  id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  email        TEXT NOT NULL UNIQUE,
  title        TEXT,
  role         TEXT NOT NULL DEFAULT 'interviewer'
                 CHECK (role IN ('admin','hr','manager','interviewer','employee')),
  avatar       TEXT,
  department   TEXT,
  is_active    BOOLEAN DEFAULT true,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'interviewer')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ─── JOBS ─────────────────────────────────────────────────────
CREATE TABLE jobs (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title         TEXT NOT NULL,
  department    TEXT NOT NULL,
  location      TEXT NOT NULL,
  type          TEXT NOT NULL DEFAULT 'Full-time'
                  CHECK (type IN ('Full-time','Part-time','Contract','Internship')),
  salary        TEXT,
  reporting_to  TEXT,
  skills        TEXT,
  jd            TEXT,
  status        TEXT NOT NULL DEFAULT 'active'
                  CHECK (status IN ('draft','active','paused','closed')),
  posted_by     UUID REFERENCES profiles(id),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─── CANDIDATES ───────────────────────────────────────────────
CREATE TABLE candidates (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          TEXT NOT NULL,
  email         TEXT NOT NULL,
  phone         TEXT,
  role          TEXT,
  experience    INTEGER DEFAULT 0,
  location      TEXT,
  skills        TEXT[],
  education     TEXT,
  summary       TEXT,
  cv_text       TEXT,
  cv_url        TEXT,
  rating        NUMERIC(3,1) DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
  status        TEXT DEFAULT 'available'
                  CHECK (status IN ('available','placed','not_available')),
  source        TEXT DEFAULT 'manual'
                  CHECK (source IN ('manual','upload','linkedin','naukri','indeed','internal')),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─── APPLICATIONS ─────────────────────────────────────────────
CREATE TABLE applications (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id              UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  candidate_id        UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  status              TEXT NOT NULL DEFAULT 'applied'
                        CHECK (status IN ('applied','screened','shortlisted','consent_sent','consent_accepted','consent_declined','interview_scheduled','interview_done','offer_sent','hired','rejected')),

  -- AI Screening
  screen_score        INTEGER CHECK (screen_score >= 0 AND screen_score <= 100),
  screen_recommendation TEXT CHECK (screen_recommendation IN ('shortlist','maybe','reject')),
  screen_strengths    TEXT[],
  screen_gaps         TEXT[],
  screen_summary      TEXT,
  experience_match    INTEGER,
  skills_match        INTEGER,
  education_match     INTEGER,
  screened_at         TIMESTAMPTZ,

  -- Consent
  consent_status      TEXT DEFAULT 'not_sent'
                        CHECK (consent_status IN ('not_sent','pending','accepted','declined')),
  consent_sent_at     TIMESTAMPTZ,
  consent_token       TEXT UNIQUE DEFAULT uuid_generate_v4()::text,

  -- Interview
  interview_date      TEXT,
  interview_scheduled_at TIMESTAMPTZ,
  interview_feedback  TEXT,
  interview_done_at   TIMESTAMPTZ,

  -- Offer & Hire
  offer_sent_at       TIMESTAMPTZ,
  hired_at            TIMESTAMPTZ,
  emp_id              TEXT UNIQUE,

  -- Meta
  applied_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(job_id, candidate_id)
);

-- ─── EMPLOYEES ────────────────────────────────────────────────
CREATE TABLE employees (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  emp_id          TEXT NOT NULL UNIQUE,
  candidate_id    UUID REFERENCES candidates(id),
  application_id  UUID REFERENCES applications(id),
  profile_id      UUID REFERENCES profiles(id),
  name            TEXT NOT NULL,
  email           TEXT NOT NULL,
  phone           TEXT,
  job_title       TEXT,
  department      TEXT,
  location        TEXT,
  reporting_to    UUID REFERENCES employees(id),
  date_of_joining DATE,
  status          TEXT DEFAULT 'active'
                    CHECK (status IN ('active','inactive','on_leave')),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── TRAINING MODULES ─────────────────────────────────────────
CREATE TABLE training_modules (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title       TEXT NOT NULL,
  description TEXT,
  type        TEXT NOT NULL CHECK (type IN ('video','document','quiz')),
  duration    TEXT,
  content_url TEXT,
  profile_tags TEXT[],
  order_index  INTEGER DEFAULT 0,
  is_mandatory BOOLEAN DEFAULT true,
  created_by  UUID REFERENCES profiles(id),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── TRAINING PROGRESS ────────────────────────────────────────
CREATE TABLE training_progress (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id  UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  module_id    UUID NOT NULL REFERENCES training_modules(id) ON DELETE CASCADE,
  status       TEXT DEFAULT 'pending'
                 CHECK (status IN ('pending','in_progress','completed')),
  completed_at TIMESTAMPTZ,
  UNIQUE(employee_id, module_id)
);

-- ─── QUIZ RESULTS ─────────────────────────────────────────────
CREATE TABLE quiz_results (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id  UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  score        INTEGER NOT NULL,
  total        INTEGER NOT NULL,
  passed       BOOLEAN NOT NULL,
  answers      JSONB,
  attempt      INTEGER DEFAULT 1,
  manager_approved     BOOLEAN DEFAULT false,
  manager_approved_by  UUID REFERENCES profiles(id),
  manager_approved_at  TIMESTAMPTZ,
  taken_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ─── HELP TICKETS ─────────────────────────────────────────────
CREATE TABLE help_tickets (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id  UUID NOT NULL REFERENCES employees(id),
  raised_by    UUID REFERENCES profiles(id),
  subject      TEXT NOT NULL,
  description  TEXT,
  status       TEXT DEFAULT 'open'
                 CHECK (status IN ('open','in_progress','resolved','closed')),
  assigned_to  UUID REFERENCES profiles(id),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─── CRM LEADS ────────────────────────────────────────────────
CREATE TABLE crm_leads (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name         TEXT NOT NULL,
  company      TEXT,
  phone        TEXT,
  email        TEXT,
  status       TEXT DEFAULT 'new'
                 CHECK (status IN ('new','interested','callback','not_interested','converted','lost')),
  notes        TEXT,
  reminder_at  TIMESTAMPTZ,
  assigned_to  UUID REFERENCES profiles(id),
  last_contact TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─── CRM CALL LOGS ────────────────────────────────────────────
CREATE TABLE crm_call_logs (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id      UUID NOT NULL REFERENCES crm_leads(id) ON DELETE CASCADE,
  called_by    UUID REFERENCES profiles(id),
  disposition  TEXT NOT NULL,
  notes        TEXT,
  duration_sec INTEGER,
  called_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─── TASKS ────────────────────────────────────────────────────
CREATE TABLE tasks (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title        TEXT NOT NULL,
  description  TEXT,
  frequency    TEXT NOT NULL DEFAULT 'daily'
                 CHECK (frequency IN ('daily','weekly','monthly','one-time')),
  priority     TEXT DEFAULT 'medium'
                 CHECK (priority IN ('low','medium','high')),
  profile_tags TEXT[],
  created_by   UUID REFERENCES profiles(id),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─── TASK COMPLETIONS ─────────────────────────────────────────
CREATE TABLE task_completions (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id      UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  employee_id  UUID REFERENCES employees(id),
  profile_id   UUID REFERENCES profiles(id),
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  notes        TEXT
);

-- ─── EMAIL LOGS ───────────────────────────────────────────────
CREATE TABLE email_logs (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  to_email     TEXT NOT NULL,
  to_name      TEXT,
  subject      TEXT NOT NULL,
  type         TEXT NOT NULL,
  status       TEXT DEFAULT 'sent'
                 CHECK (status IN ('sent','failed','bounced')),
  resend_id    TEXT,
  metadata     JSONB,
  sent_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── INDEXES ──────────────────────────────────────────────────
CREATE INDEX idx_applications_job_id ON applications(job_id);
CREATE INDEX idx_applications_candidate_id ON applications(candidate_id);
CREATE INDEX idx_applications_status ON applications(status);
CREATE INDEX idx_applications_consent_token ON applications(consent_token);
CREATE INDEX idx_training_progress_employee ON training_progress(employee_id);
CREATE INDEX idx_crm_leads_assigned_to ON crm_leads(assigned_to);
CREATE INDEX idx_crm_leads_status ON crm_leads(status);
CREATE INDEX idx_task_completions_profile ON task_completions(profile_id);

-- ─── UPDATED_AT TRIGGER ───────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated    BEFORE UPDATE ON profiles    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_jobs_updated        BEFORE UPDATE ON jobs        FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_candidates_updated  BEFORE UPDATE ON candidates  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_applications_updated BEFORE UPDATE ON applications FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_employees_updated   BEFORE UPDATE ON employees   FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_crm_leads_updated   BEFORE UPDATE ON crm_leads   FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── ROW LEVEL SECURITY ───────────────────────────────────────
ALTER TABLE profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs               ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidates         ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications       ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees          ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_modules   ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_progress  ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_results       ENABLE ROW LEVEL SECURITY;
ALTER TABLE help_tickets       ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_leads          ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_call_logs      ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks              ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_completions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_logs         ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read all (granular control via app layer)
CREATE POLICY "authenticated_read_profiles"    ON profiles         FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_read_jobs"        ON jobs             FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_read_candidates"  ON candidates       FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_read_applications" ON applications    FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_read_employees"   ON employees        FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_read_training"    ON training_modules FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_read_progress"    ON training_progress FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_read_quiz"        ON quiz_results     FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_read_tickets"     ON help_tickets     FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_read_leads"       ON crm_leads        FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_read_calls"       ON crm_call_logs    FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_read_tasks"       ON tasks            FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_read_completions" ON task_completions FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_read_emails"      ON email_logs       FOR SELECT USING (auth.role() = 'authenticated');

-- Write policies
CREATE POLICY "authenticated_write_profiles"    ON profiles         FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_write_jobs"        ON jobs             FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_write_candidates"  ON candidates       FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_write_applications" ON applications    FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_write_employees"   ON employees        FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_write_training"    ON training_modules FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_write_progress"    ON training_progress FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_write_quiz"        ON quiz_results     FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_write_tickets"     ON help_tickets     FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_write_leads"       ON crm_leads        FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_write_calls"       ON crm_call_logs    FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_write_tasks"       ON tasks            FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_write_completions" ON task_completions FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_write_emails"      ON email_logs       FOR ALL USING (auth.role() = 'authenticated');
