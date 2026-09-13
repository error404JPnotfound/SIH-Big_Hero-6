# CareConnect — Healthcare Access & Continuity Platform

> **Connected healthcare from the local health centre to the specialist.**

CareConnect is a production-ready, full-stack healthcare access and continuity platform designed for rural and underserved communities. It strengthens existing public health systems rather than replacing them.

Built for **Smart India Hackathon (SIH)** by **Team Big Hero 6**.

---

## Quick Start

```bash
npm install
npm run dev   # http://localhost:5173
npm run build
```

---

## Access the Application

| URL | Portal |
|-----|--------|
| `http://localhost:5173/` | Public Landing Page |
| `http://localhost:5173/login` | Login / Register |
| `http://localhost:5173/register` | Doctor & Patient Registration |
| `http://localhost:5173/patient` | Patient Dashboard |
| `http://localhost:5173/doctor` | Doctor Dashboard |
| `http://localhost:5173/admin` | Admin Dashboard |

---

## Demo Mode

On the Login page:
1. Select your **role** (Patient / Doctor / Admin)
2. Click **"Enter Demo Mode"** to explore with realistic sample data
3. No Supabase account needed for the patient/admin demo

> **Doctor demo note:** Doctor data is loaded from Supabase. To view live appointments and queue, sign in with a real doctor email (use the seeded account or register as a doctor and wait for admin approval).

---

## Project Structure

```
src/
├── lib/
│   ├── supabase.js          # Supabase client
│   ├── db.js                # All Supabase query functions (CRUD)
│   ├── adminLive.js         # Admin live data helpers
│   ├── clinicalUpdates.js   # Clinical update utilities
│   ├── facilityTypes.js     # Facility type constants
│   ├── brevo.js             # Email notifications via Brevo
│   ├── mockData.js          # Demo data for all entities
│   └── utils.js             # Helpers (cn, formatDate)
│
├── context/
│   └── AuthContext.jsx      # Auth state, demo mode, password recovery
│
├── hooks/
│   ├── useFacilities.js     # Facility data fetching hook
│   ├── useLiveRecords.js    # Realtime clinical records hook
│   └── useSupabase.js       # Generic Supabase hook
│
├── services/
│   ├── api.js               # appointmentService, facilityService, liveOsmCache
│   └── notificationService.js  # Push / in-app notifications
│
├── components/
│   ├── PatientPrescriptions.jsx  # Dynamic prescription viewer
│   ├── RecordDetails.jsx         # Record detail modal
│   ├── RecordEditor.jsx          # Clinical record editor
│   ├── auth/
│   │   └── ProtectedRoute.jsx    # Role-based route guard
│   ├── layout/
│   │   ├── AppLayout.jsx         # Sidebar, Topbar, Mobile nav
│   │   └── NotificationDropdown.jsx  # Live notification bell
│   └── ui/
│       ├── Badge.jsx
│       ├── Button.jsx
│       ├── Card.jsx              # Card, KPICard
│       ├── FacilityMap.jsx       # Leaflet map component
│       ├── Input.jsx             # Input, Select, Textarea
│       ├── Misc.jsx              # Timeline, ProgressBar, Alert, Skeleton
│       ├── Modal.jsx
│       └── Tabs.jsx
│
├── pages/
│   ├── public/
│   │   ├── LandingPage.jsx       # Marketing site
│   │   ├── LoginPage.jsx         # Role select + Phone OTP + Email/Password + Password Reset
│   │   └── RegisterPage.jsx      # Patient, Doctor, Admin self-registration
│   │
│   ├── patient/
│   │   ├── PatientDashboard.jsx  # Overview, vitals, appointments
│   │   ├── Appointments.jsx      # Multi-step booking wizard + referral booking + share
│   │   ├── Queue.jsx             # Live queue position
│   │   ├── Records.jsx           # Longitudinal health records
│   │   ├── Diagnostics.jsx       # Test requests & results
│   │   ├── Medicines.jsx         # Medicine availability + prescribed medicines
│   │   ├── FacilityFinder.jsx    # OSM-powered facility search & map
│   │   └── FacilityDetails.jsx   # Facility detail view with doctors & appointments
│   │
│   ├── doctor/
│   │   ├── DoctorDashboard.jsx   # KPIs, queue table, pending approvals, availability toggle
│   │   ├── DoctorQueue.jsx       # Full queue management + consultation modal
│   │   ├── DoctorWorklist.jsx    # Worklist: referrals, diagnostics, prescriptions, follow-ups
│   │   └── PatientProfile.jsx    # Full clinical profile + records + prescriptions
│   │
│   └── admin/
│       ├── AdminDashboard.jsx    # Operations overview + live data
│       ├── Facilities.jsx        # Facility status & management
│       ├── Doctors.jsx           # Doctor approval / rejection panel
│       ├── Patients.jsx          # Patient management
│       ├── Referrals.jsx         # Referral tracking
│       ├── HighRisk.jsx          # High-risk patient monitoring
│       ├── MedicineStock.jsx     # Medicine stock management
│       └── QualityMonitor.jsx    # Healthcare quality KPIs
│
├── App.jsx                  # All routes (protected)
├── main.jsx                 # React entry
└── index.css                # Tailwind v4 + CareConnect design tokens
```

---

## Database Schema & Migrations

The complete PostgreSQL schema is in [`supabase_schema.sql`](./supabase_schema.sql).

### Migration files (run in order):

| File | Purpose |
|------|---------|
| `supabase_schema.sql` | Full base schema |
| `seed_inserts.sql` | Seed data (facilities, medicines, test users) |
| `seed_admin_data.sql` | Admin test accounts |
| `doctor_approval_migration.sql` | Doctor self-registration & approval workflow |
| `doctor_pages_migration.sql` | Doctor-side clinical pages schema |
| `doctor_profiles_patient_read_migration.sql` | RLS: doctors can read patient profiles |
| `doctor_demo_permissions.sql` | Demo doctor account permissions |
| `portal_integration_migration.sql` | Full portal integration (appointments / queue / prescriptions) |

### Key tables:
- `profiles` extends `auth.users`
- `patients`, `doctors` (with `account_status` approval workflow), `facilities`
- `appointments`, `queues` (Realtime)
- `consultations`, `vitals`, `diagnoses`
- `prescriptions`, `prescription_items`
- `referrals`, `diagnostics`
- `medicines`, `medicine_stock`
- `follow_ups`, `notifications`
- `emergency_cases`, `audit_logs`

All sensitive tables have **Row Level Security (RLS)** policies enforced at the database layer.

---

## Environment Variables

Create a `.env` file:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19 + Vite 8 |
| Styling | Tailwind CSS v4 |
| Routing | React Router v7 |
| Backend (primary) | Supabase (PostgreSQL + Auth + Realtime + Storage) |
| Auth | Supabase Auth (Phone OTP + Email/Password + Password Reset) |
| Realtime | Supabase Realtime (queue, notifications, clinical records) |
| Maps | Leaflet + OpenStreetMap (OSM) |
| Triage API | FastAPI (Python) in `Create API/medical-triage-api/` |
| Express Backend | Node.js + Express in `backend/` |
| Email | Brevo (appointment confirmations) |
| Icons | Lucide React |

---

## User Roles & Features

| Role | Portal | Key Features |
|------|--------|-------------|
| **Patient** | `/patient/*` | Dashboard, Appointment Booking, Live Queue, Health Records, Diagnostics, Prescribed Medicines, Facility Finder (OSM map), Facility Details |
| **Doctor** | `/doctor/*` | Dashboard (KPIs + pending approvals + availability toggle), Queue Management, Consultation Modal, Patient Profile, Worklist |
| **Admin** | `/admin/*` | Operations Dashboard, Doctor Approval Panel, Facilities, Patient Management, Referrals, High-Risk Monitoring, Medicine Stock, Quality Monitor |

---

## Key Features

### Patient Portal
- **Facility Finder** — OSM-powered map to locate hospitals, clinics, PHCs
- **Multi-step Appointment Booking** — Facility > Doctor > Time Slot > Confirm; supports referral-linked bookings
- **Live Queue Tracking** — Real-time position with progress indicator
- **Clinical Records** — Longitudinal timeline-based health history
- **Diagnostics** — Test requests with result viewer
- **Prescribed Medicines** — View doctor-issued prescriptions alongside medicine stock
- **Appointment Sharing** — Share appointment details via native share API

### Doctor Portal
- **Smart Dashboard** — KPI cards (waiting, completed, high-risk, emergency), pending appointment approval table, active consultation banner
- **Availability Toggle** — Doctors can open/close their clinic with one click
- **Pending Appointment Approvals** — Approve or decline patient-booked appointments from the dashboard
- **Full Queue Management** — Skip, start, complete patients with real-time Supabase subscription
- **Consultation Modal** — Notes, Vitals, Prescription, Referral tabs
- **Patient Profile** — Full clinical history with records, prescriptions, diagnostics
- **Worklist** — Referrals, diagnostics, prescriptions, follow-ups

### Admin Portal
- **Doctor Approval Workflow** — Approve / reject self-registered doctors with reason
- **Live Operations Dashboard** — Real-time facility and appointment metrics
- **Facility Management** — Status, capacity, and service monitoring
- **High-Risk Patient Monitoring** — Maternal, Child, Diabetic, TB, Elderly
- **Medicine Stock** — Stock level alerts and management
- **Quality Monitor** — 8 KPIs with sparklines

### Platform-wide
- **Protected Routes** — Role-based route guards via `ProtectedRoute.jsx`
- **Realtime Notifications** — In-app notification bell with clear action
- **Password Reset** — Supabase email-based password recovery
- **Doctor Self-Registration** — Full profile form with specialization, availability, facility assignment (pending admin approval)
- **Demo Mode** — Explore all portals without credentials
- **Responsive** — Mobile-first; bottom nav on mobile, collapsible sidebar on desktop
- **RBAC** — RLS at database level, role-based navigation

### AI Triage API
- FastAPI microservice at `Create API/medical-triage-api/`
- Accepts symptoms, returns urgency level and recommended care pathway
- Integrated with the patient appointment booking flow

---

## Security Architecture

- Supabase Auth (JWT sessions, phone OTP, email/password)
- PostgreSQL Row Level Security on every sensitive table
- Doctor account approval gating (`account_status: pending > approved`)
- Audit trail via Postgres triggers on referrals, prescriptions, consultations
- Supabase Storage (private buckets, signed URLs for documents)
- HTTPS/TLS via Supabase managed infrastructure

---

## Scripts & Utilities

| File | Purpose |
|------|---------|
| `scripts/seed_doctor_demo.js` | Seed demo doctor account |
| `scripts/check_live_admin.mjs` | Verify admin live data |
| `scripts/verify_portal_integration.sql` | SQL checks for portal integration |
| `scripts/seed_india_facilities.js` | Seed Indian healthcare facilities |
| `scripts/test_backend.cjs` | Test Express backend endpoints |

---

## Team

**Team Big Hero 6** — Smart India Hackathon 2024
