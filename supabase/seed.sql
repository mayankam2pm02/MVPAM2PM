-- ============================================================
-- TalentOS MVP — Seed Data
-- Run AFTER schema.sql in Supabase SQL Editor
-- ============================================================

-- ─── DEMO CANDIDATES ─────────────────────────────────────────
INSERT INTO candidates (name, email, phone, role, experience, location, skills, education, summary, rating, status, source, cv_text) VALUES
(
  'Arjun Kapoor', 'arjun.kapoor@gmail.com', '+91 98100 11223',
  'Software Engineer', 4, 'Bangalore',
  ARRAY['React','Node.js','PostgreSQL','AWS','TypeScript','Docker'],
  'B.Tech Computer Science, IIT Delhi',
  'Full-stack developer with 4 years at early-stage startups. Built 2 products from 0 to 1.',
  4.5, 'available', 'internal',
  'Arjun Kapoor — Software Engineer
Email: arjun.kapoor@gmail.com | Location: Bangalore

EXPERIENCE
Senior Software Engineer — TechStart Pvt Ltd (2022–Present)
- Led React/TypeScript frontend for B2B SaaS (500+ clients)
- Built Node.js/Express APIs with PostgreSQL (100k+ daily requests)
- AWS deployment reducing infra costs by 30%

Software Engineer — CodeCraft Solutions (2020–2022)
- Full-stack e-commerce (React + Django)
- Integrated Razorpay payment gateway

EDUCATION
B.Tech CS — IIT Delhi (2016–2020) CGPA: 8.4/10

SKILLS
React, TypeScript, Node.js, PostgreSQL, AWS, Docker, Redis'
),
(
  'Sneha Iyer', 'sneha.iyer@outlook.com', '+91 99200 33445',
  'Sales Executive', 3, 'Mumbai',
  ARRAY['B2B Sales','CRM','Lead Generation','Negotiation','Salesforce'],
  'MBA Marketing, SP Jain Institute',
  'Consistently top 10% sales performer. Closed Rs 2Cr+ in ARR last year.',
  4.8, 'available', 'internal',
  'Sneha Iyer — Sales Executive
Email: sneha.iyer@outlook.com | Location: Mumbai

EXPERIENCE
Senior Sales Executive — CloudSoft India (2021–Present)
- Closed Rs 2.1 Cr in ARR in FY2023, 140% of target
- Managed 45+ enterprise accounts across BFSI and retail
- Used Salesforce CRM, conducted 200+ product demos

Sales Executive — InfoPro Solutions (2019–2021)
- Generated 80+ qualified leads per month
- Converted 28% leads to paid customers (industry avg 18%)

EDUCATION
MBA Marketing — SP Jain Institute (2017–2019)
B.Com — Mumbai University (2014–2017)

SKILLS
B2B SaaS Sales, Salesforce, HubSpot, LinkedIn Sales Navigator, Negotiation'
),
(
  'Rohit Nair', 'rohit.nair@gmail.com', '+91 97300 55667',
  'Data Analyst', 2, 'Hyderabad',
  ARRAY['Python','SQL','Power BI','Excel','Tableau','BigQuery'],
  'B.Sc Statistics, University of Hyderabad',
  'Data analyst with strong SQL skills. Built dashboards used by C-suite.',
  3.9, 'available', 'internal',
  'Rohit Nair — Data Analyst
Email: rohit.nair@gmail.com | Location: Hyderabad

EXPERIENCE
Data Analyst — Analytics Co. (2022–Present)
- Built Power BI dashboards for 50+ stakeholders
- Complex SQL across PostgreSQL and BigQuery
- Python data pipelines saving 8 hrs/week

Junior Analyst — DataBridge (2021–2022)
- Cleaned 1M+ row datasets with Pandas and Excel

EDUCATION
B.Sc Statistics — University of Hyderabad (2018–2021) First Class

SKILLS
Python, SQL, Power BI, Tableau, BigQuery, Excel (Advanced)'
),
(
  'Meera Pillai', 'meera.pillai@yahoo.com', '+91 96400 77889',
  'HR Executive', 5, 'Chennai',
  ARRAY['Recruitment','Onboarding','HRMS','Payroll','Compliance'],
  'MBA HR, Symbiosis Institute',
  'Handled end-to-end recruitment for 200+ roles. Expert in HRMS systems.',
  4.2, 'available', 'internal',
  'Meera Pillai — HR Executive
Email: meera.pillai@yahoo.com | Location: Chennai

EXPERIENCE
HR Executive — GrowFast Technologies (2019–Present)
- End-to-end recruitment for 200+ roles
- Reduced time-to-hire from 45 to 28 days
- Implemented Darwinbox HRMS for 300+ employees

HR Assistant — TalentFirst (2018–2019)
- Bulk hiring for BPO client (100+ positions)

EDUCATION
MBA HR — Symbiosis Institute (2016–2018)
B.A. Psychology — Madras University (2013–2016)

SKILLS
Recruitment, Darwinbox, GreytHR, Payroll, PF/ESIC Compliance, Onboarding'
),
(
  'Vikram Singh', 'vikram.singh@gmail.com', '+91 95500 99001',
  'Business Development Manager', 6, 'Delhi',
  ARRAY['B2B Sales','Partnerships','Strategy','Team Management','SaaS'],
  'MBA, IIM Lucknow',
  'Built BD function from scratch at two startups. Managed team of 8.',
  4.6, 'available', 'internal',
  'Vikram Singh — Business Development Manager
Email: vikram.singh@gmail.com | Location: Delhi

EXPERIENCE
BD Manager — ScaleUp Ventures (2020–Present)
- Built BD team 0 to 8; exceeded Rs 5Cr target by 120%
- 15+ strategic partnerships with SIs and VARs
- Enterprise contracts with Fortune 500 companies
- Reduced CAC by 35% via ICP and GTM strategy

Senior BD Executive — CloudBase India (2018–2020)
- Closed Rs 1.8Cr new business year 1; promoted in 8 months

EDUCATION
MBA — IIM Lucknow (2016–2018) Silver Medalist
B.Tech — NIT Jaipur (2012–2016)

SKILLS
B2B Sales, SaaS GTM, Partnerships, Team Leadership, Salesforce, Revenue Forecasting'
);

-- ─── DEMO JOBS ────────────────────────────────────────────────
INSERT INTO jobs (title, department, location, type, salary, reporting_to, skills, status, jd) VALUES
(
  'Senior Sales Executive', 'Sales', 'Mumbai', 'Full-time',
  'Rs 8-12 LPA', 'VP Sales', 'B2B Sales, Salesforce, SaaS, Negotiation',
  'active',
  'We are looking for a driven Senior Sales Executive to join our growing sales team in Mumbai.

About the Role
You will own the end-to-end sales cycle and drive new business acquisition in the B2B SaaS space.

Key Responsibilities
- Own sales cycle from prospecting to closure
- Achieve monthly and quarterly revenue targets
- Build and manage pipeline of 50+ qualified opportunities
- Conduct product demos and negotiate contracts
- Maintain accurate Salesforce CRM records
- Collaborate with marketing on demand generation

Requirements
- 3-6 years B2B sales experience (SaaS preferred)
- Proven track record of meeting or exceeding targets
- Strong communication and negotiation skills
- CRM experience (Salesforce preferred)

What We Offer
- Competitive base plus uncapped commissions
- Health insurance for self and family
- 5-day work week
- High-growth startup environment'
);

-- ─── TRAINING MODULES ─────────────────────────────────────────
INSERT INTO training_modules (title, description, type, duration, profile_tags, order_index, is_mandatory) VALUES
('Company Overview & Culture',         'Understand our mission, values, and team structure.',                              'video',    '12 min', ARRAY['all'],         1, true),
('HR Policies & Code of Conduct',      'Leave policy, performance review cycle, and workplace guidelines.',                'document', '20 min', ARRAY['all'],         2, true),
('Tools & Systems Access',             'Setting up all tools — email, Slack, HRMS, and more.',                            'video',    '10 min', ARRAY['all'],         3, true),
('Product Knowledge — SaaS Platform',  'Deep dive into product features, use cases, and competitive differentiation.',     'document', '20 min', ARRAY['sales','bd'],  4, true),
('Sales Process & CRM Usage',          'End-to-end sales cycle walkthrough with live CRM demonstration.',                  'video',    '18 min', ARRAY['sales','bd'],  5, true),
('Objection Handling Playbook',        'Common objections and proven response frameworks.',                                'document', '15 min', ARRAY['sales','bd'],  6, true),
('Compliance & Data Privacy',          'GDPR, customer data handling, and sales ethics guidelines.',                       'document', '10 min', ARRAY['sales','bd'],  7, true),
('Engineering Onboarding',             'Dev environment setup, codebase walkthrough, and team norms.',                    'video',    '20 min', ARRAY['engineering'], 4, true),
('Architecture & Tech Stack',          'System architecture, design principles, and tech decisions.',                      'document', '25 min', ARRAY['engineering'], 5, true),
('Deployment & CI/CD',                 'How to ship code safely — branch strategy, PR reviews, and deploys.',              'video',    '15 min', ARRAY['engineering'], 6, true),
('Security & Code Standards',          'Secure coding practices and style guidelines.',                                    'document', '12 min', ARRAY['engineering'], 7, true);

-- ─── CRM LEADS ────────────────────────────────────────────────
INSERT INTO crm_leads (name, company, phone, email, status, notes) VALUES
('Raj Malhotra',   'Infosys BPO',     '+91 98111 22334', 'raj@infosys.com',    'interested',    'Wants demo next week'),
('Sunita Agarwal', 'TCS Ltd',         '+91 98222 33445', 'sunita@tcs.com',     'callback',      'Call back Thursday 3pm'),
('Deepak Joshi',   'Wipro Digital',   '+91 97333 44556', 'deepak@wipro.com',   'not_interested','Already using competitor'),
('Pooja Reddy',    'HCL Technologies','+91 96444 55667', 'pooja@hcl.com',      'new',           ''),
('Amit Shah',      'Cognizant',       '+91 95555 66778', 'amit@cognizant.com', 'interested',    'Send proposal by Friday');

-- ─── TASKS ────────────────────────────────────────────────────
INSERT INTO tasks (title, frequency, priority, profile_tags) VALUES
('Make 30 cold calls',                        'daily',   'high',   ARRAY['sales','bd']),
('Update CRM with call dispositions',         'daily',   'medium', ARRAY['sales','bd']),
('Follow up on pending proposals',            'daily',   'high',   ARRAY['sales','bd']),
('Complete onboarding self-assessment',       'one-time','high',   ARRAY['all']),
('Weekly pipeline review with manager',       'weekly',  'medium', ARRAY['sales','bd']),
('Submit weekly activity report',             'weekly',  'medium', ARRAY['all']),
('Monthly target review and planning',        'monthly', 'high',   ARRAY['sales','bd']),
('Daily standup with team',                   'daily',   'high',   ARRAY['engineering']),
('Review and merge open PRs',                 'daily',   'medium', ARRAY['engineering']),
('Sprint planning attendance',                'weekly',  'high',   ARRAY['engineering']),
('Monthly 1-on-1 with engineering manager',   'monthly', 'medium', ARRAY['engineering']);
