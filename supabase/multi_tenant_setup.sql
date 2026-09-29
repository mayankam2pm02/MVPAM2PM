-- ============================================================
-- TalentOS Multi-Tenant Setup — Supabase PostgreSQL Schema
-- Run this ONCE in your Supabase SQL Editor
-- ============================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. CREATE COMPANIES TABLE
CREATE TABLE IF NOT EXISTS companies (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name         TEXT NOT NULL,
  slug         TEXT UNIQUE,
  admin_name   TEXT,
  admin_email  TEXT,
  logo_url     TEXT,
  status       TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'locked')),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- 3. UPDATE PROFILES FOR MULTI-TENANCY & SUPERADMIN
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE SET NULL;

-- Update role check constraint to include superadmin
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check 
  CHECK (role IN ('superadmin', 'admin', 'hr', 'manager', 'interviewer', 'employee'));

-- 4. ADD company_id TO CORE BUSINESS TABLES
ALTER TABLE jobs 
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;

ALTER TABLE candidates 
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;

ALTER TABLE applications 
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;

ALTER TABLE employees 
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;

ALTER TABLE crm_leads 
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;

ALTER TABLE tasks 
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;

ALTER TABLE email_logs 
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;

ALTER TABLE training_modules 
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE SET NULL;

-- 5. CREATE DEFAULT DEMO COMPANIES (If none exist)
INSERT INTO companies (id, name, slug, admin_name, admin_email)
VALUES 
  ('a0000000-0000-0000-0000-000000000001', 'Acme Corporation', 'acme', 'Priya Sharma', 'priya@acme.com'),
  ('a0000000-0000-0000-0000-000000000002', 'TechCorp Solutions', 'techcorp', 'Rahul Verma', 'rahul@techcorp.com')
ON CONFLICT (id) DO NOTHING;

-- Assign any existing orphan jobs and candidates to the default Acme company
UPDATE jobs SET company_id = 'a0000000-0000-0000-0000-000000000001' WHERE company_id IS NULL;
UPDATE candidates SET company_id = 'a0000000-0000-0000-0000-000000000001' WHERE company_id IS NULL;
UPDATE employees SET company_id = 'a0000000-0000-0000-0000-000000000001' WHERE company_id IS NULL;
UPDATE applications SET company_id = 'a0000000-0000-0000-0000-000000000001' WHERE company_id IS NULL;
UPDATE crm_leads SET company_id = 'a0000000-0000-0000-0000-000000000001' WHERE company_id IS NULL;
UPDATE tasks SET company_id = 'a0000000-0000-0000-0000-000000000001' WHERE company_id IS NULL;

-- 6. MAKE mayank@am2pmsupport.com SUPER ADMIN
-- If a profile exists for this email, elevate to superadmin
UPDATE profiles 
SET role = 'superadmin', title = 'Super Administrator'
WHERE email = 'mayank@am2pmsupport.com';

-- 7. ENABLE ROW LEVEL SECURITY ON COMPANIES
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated_read_companies" ON companies;
CREATE POLICY "authenticated_read_companies" ON companies FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "authenticated_write_companies" ON companies;
CREATE POLICY "authenticated_write_companies" ON companies FOR ALL USING (auth.role() = 'authenticated');

-- 8. CREATE ACCESS LOGS TABLE FOR SECURITY AUDIT TRAIL
CREATE TABLE IF NOT EXISTS access_logs (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id    UUID REFERENCES companies(id) ON DELETE CASCADE,
  user_name     TEXT,
  user_email    TEXT,
  user_role     TEXT,
  action        TEXT NOT NULL,
  action_label  TEXT,
  details       TEXT,
  ip_address    TEXT,
  device        TEXT,
  status        TEXT DEFAULT 'success',
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE access_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated_read_access_logs" ON access_logs;
CREATE POLICY "authenticated_read_access_logs" ON access_logs FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "authenticated_write_access_logs" ON access_logs;
CREATE POLICY "authenticated_write_access_logs" ON access_logs FOR ALL USING (auth.role() = 'authenticated');

-- Done! Your database is now ready for multi-tenant company accounts.

