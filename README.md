# CareConnect — Healthcare Access & Continuity Platform

> **Connected healthcare from the local health centre to the specialist.**

CareConnect is a production-ready, full-stack healthcare access and continuity platform designed for rural and underserved communities. It strengthens existing public health systems rather than replacing them.

---

## 🚀 Quick Start

```bash
# Install dependencies (already done)
npm install

# Start development server
npm run dev
# → http://localhost:5173

# Build for production
npm run build
```

## 🌐 Access the Application

| URL | Portal |
|-----|--------|
| `http://localhost:5173/` | Public Landing Page |
| `http://localhost:5173/login` | Login Page |
| `http://localhost:5173/patient` | Patient Dashboard |
| `http://localhost:5173/doctor` | Doctor Dashboard |
| `http://localhost:5173/admin` | Admin Dashboard |

## 🎭 Demo Mode

On the Login page:
1. Select your **role** (Patient / Doctor / Admin)
2. Click **"Enter Demo Mode"** to explore with realistic sample data
3. No Supabase account needed for the demo

---

## 🏗️ Project Structure

```
src/
├── lib/
│   ├── supabase.js        # Supabase client
│   ├── utils.js           # Helpers (cn, formatDate)
│   └── mockData.js        # Demo data for all entities
│
├── context/
│   └── AuthContext.jsx    # Auth state + demo mode
│
├── components/
│   ├── layout/
│   │   └── AppLayout.jsx  # Sidebar, Topbar, Mobile nav
│   └── ui/
│       ├── Badge.jsx
│       ├── Button.jsx
│       ├── Card.jsx        # Card, KPICard
│       ├── Input.jsx       # Input, Select, Textarea
│       ├── Misc.jsx        # Timeline, ProgressBar, Alert, Skeleton
│       ├── Modal.jsx
│       └── Tabs.jsx
│
├── pages/
│   ├── public/
│   │   ├── LandingPage.jsx # Full marketing site
│   │   └── LoginPage.jsx   # Role select + Phone OTP + Email/Password
│   │
│   ├── patient/
│   │   ├── PatientDashboard.jsx  # Overview, vitals, appointments
│   │   ├── Appointments.jsx      # Multi-step booking wizard
│   │   ├── Queue.jsx             # Live queue position
│   │   ├── Records.jsx           # Longitudinal health records
│   │   ├── Referrals.jsx         # Referral tracking with stepper
│   │   ├── Diagnostics.jsx       # Test requests & results
│   │   └── Medicines.jsx         # Medicine availability search
│   │
│   ├── doctor/
│   │   ├── DoctorDashboard.jsx   # KPIs, queue table
│   │   ├── DoctorQueue.jsx       # Queue management + Consultation modal
│   │   └── PatientProfile.jsx    # Full clinical profile view
│   │
│   └── admin/
│       ├── AdminDashboard.jsx    # Operations overview
│       ├── Facilities.jsx        # Facility status cards
│       ├── HighRisk.jsx          # High-risk patient monitoring
│       └── QualityMonitor.jsx    # Healthcare quality indicators
│
├── App.jsx                 # All routes
├── main.jsx                # React entry
└── index.css               # Tailwind v4 + CareConnect theme
```

---

## 🗄️ Database Schema

The complete PostgreSQL schema is in [`supabase_schema.sql`](./supabase_schema.sql). Apply it to your Supabase project.

### Key tables:
- `profiles` → extends `auth.users`
- `patients`, `doctors`, `facilities`
- `appointments`, `queues` (Realtime)
- `consultations`, `vitals`, `diagnoses`
- `prescriptions`, `prescription_items`
- `referrals`, `diagnostics`
- `medicines`, `medicine_stock`
- `follow_ups`, `notifications`
- `emergency_cases`, `audit_logs`

All sensitive tables have **Row Level Security (RLS)** policies enforced at the database layer.

---

## ⚙️ Environment Variables

Create a `.env` file:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

---

## 🛡️ Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19 + Vite 8 |
| Styling | Tailwind CSS v4 |
| Routing | React Router v7 |
| Backend | Supabase (PostgreSQL) |
| Auth | Supabase Auth (Phone OTP + Email) |
| Realtime | Supabase Realtime (queue updates) |
| Storage | Supabase Storage (reports, prescriptions) |
| Icons | Lucide React |
| Animations | Framer Motion |
| i18n | react-i18next (EN / HI / GU) |

---

## 👥 User Roles

| Role | Portal | Features |
|------|--------|----------|
| **Patient** | `/patient/*` | Dashboard, Appointments, Queue, Records, Referrals, Diagnostics, Medicines |
| **Doctor** | `/doctor/*` | Dashboard, Queue Management, Consultation Modal, Patient Profile |
| **Admin** | `/admin/*` | Operations Dashboard, Facilities, High-Risk, Quality Monitor |

---

## 🌟 Key Features

- **Premium healthcare UI** — Deep Navy, Healthcare Teal palette; Inter typography
- **Multi-step Appointment Booking** — 5-step wizard with slot selection
- **Live Queue Management** — Position display with progress indicator
- **Clinical Consultation Modal** — Notes, Vitals, Prescription, Referral tabs
- **Longitudinal Health Records** — Timeline-based patient history
- **Referral Tracking** — Visual multi-step progress stepper
- **Quality Monitoring Dashboard** — 8 KPIs with sparklines and trend indicators
- **High-Risk Patient Monitoring** — Maternal, Child, Diabetic, TB, Elderly
- **Medicine Availability Search** — With distance and stock status
- **Demo Mode** — Explore all portals without Supabase credentials
- **Responsive** — Mobile-first; bottom nav on mobile, collapsible sidebar on desktop
- **RBAC** — RLS policies at database level, role-based navigation

---

## 🔒 Security Architecture

- Supabase Auth (JWT sessions)
- PostgreSQL Row Level Security on every sensitive table
- Audit trail via Postgres triggers on `referrals`, `prescriptions`, `consultations`
- Supabase Storage (private buckets, signed URLs for documents)
- HTTPS/TLS via Supabase managed infrastructure
