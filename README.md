# Mr. Manager — your virtual manager

End-to-end virtual manager covering hiring, AI resume screening, training, CRM, task management, and reporting.

## Features

- **One-time profiling** — Role-based access control, user management
- **Hiring module** — Job requisition, AI JD generation, candidate pipeline
- **AI resume screener** — Claude-powered CV screening with scores and recommendations
- **Email consent** — Automated candidate notifications via Resend
- **Training module** — Onboarding videos/docs, self-evaluation quiz, manager approval
- **CRM & Tasks** — Calling CRM with dispositions, daily/weekly task management
- **Reports** — Hiring funnel, team performance, job-wise breakdown

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite |
| Styling | Custom CSS with design tokens |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| AI | Claude API (Haiku) |
| Email | Resend |
| Hosting | Vercel |

## Setup

### 1. Clone & install

```bash
git clone https://github.com/YOUR_USERNAME/talentos-mvp.git
cd talentos-mvp
npm install
```

### 2. Environment variables

```bash
cp .env.example .env
```

Fill in your `.env`:

```env
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_CLAUDE_API_KEY=sk-ant-...
VITE_RESEND_API_KEY=re_...
VITE_APP_URL=http://localhost:3000
VITE_COMPANY_NAME=Your Company Name
```

### 3. Database setup

1. Create a project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the contents of `supabase/schema.sql`
3. Go to **SQL Editor** and run `supabase/seed.sql` for demo data

### 4. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 5. Deploy to Vercel

```bash
npm install -g vercel
vercel --prod
```

Add all environment variables in Vercel dashboard under **Settings → Environment Variables**.

## Demo Accounts

| Role | Email | Password |
|---|---|---|
| Admin (CEO) | priya@acme.com | admin123 |
| HR Manager | rahul@acme.com | hr123 |
| Sales Manager | anita@acme.com | mgr123 |
| Interviewer | karan@acme.com | int123 |

## Project Structure

```
talentos/
├── src/
│   ├── components/
│   │   ├── layout/       # Sidebar, AppShell
│   │   ├── hiring/       # HiringList, NewJob, JobDetail
│   │   ├── training/     # Training module
│   │   ├── crm/          # CRM & Tasks
│   │   ├── reports/      # Reports
│   │   └── settings/     # User management
│   ├── pages/            # Page components
│   ├── lib/              # Supabase, Claude, Resend clients
│   ├── data/             # Dummy/seed data
│   └── App.jsx
├── supabase/
│   ├── schema.sql        # Full database schema
│   └── seed.sql          # Demo data
├── public/
├── vercel.json
└── .env.example
```

## Roadmap (v2)

- [ ] LinkedIn / Naukri / Indeed API integration
- [ ] AI interviewer API integration
- [ ] Mobile app (React Native)
- [ ] WhatsApp notifications
- [ ] Advanced analytics dashboard
