# Doctor pages and Supabase

For an existing database, run `doctor_pages_migration.sql` in the Supabase SQL Editor. Do not rerun the full schema against an existing database: it contains policy resets and seed data.

The app uses `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from your local environment. Never put a service-role key in the frontend.

Sign in with a real doctor account. Its `profiles.id` must match `doctors.profile_id`, and the doctor must have a facility assigned. Demo login intentionally shows no medical records.

Appointments must reference the doctor's `doctors.id` and the patient's `patients.id`. Queue rows must reference these appointments and the doctor's facility. Today's queue uses local midnight. Patient Records lists patients from the doctor's appointments.

Patient details come from patients/profiles; vitals from the latest vitals row; conditions from diagnoses; prescription history from prescriptions/prescription_items; referrals and diagnostics from their matching tables. Missing records show empty states instead of sample values. Query errors are displayed rather than hidden as empty histories.

Verification: production build passes; lint completes with warnings. Live authenticated reads/writes and the SQL migration have not been tested against the hosted database.

## Load fictional doctor test data

Run `doctor_demo_permissions.sql` in Supabase SQL Editor if the server reports `permission denied for table facilities`. Run `doctor_pages_migration.sql` as well to allow assigned patient names to appear.

From the project folder run:

```powershell
node --env-file=.env scripts/seed_doctor_demo.js
```

The script uses the existing server secret locally and creates or updates the demo doctor email from `DOCTOR_DEMO_EMAIL`. If no override is provided, it uses `diyathakrar68@gmail.com`. It prints a new randomly generated password on each run. Use normal Doctor email sign-in, not Enter Demo Mode. No password is written into source code.

It creates five fictional patients with appointments, queues, vitals, diagnoses, prescription history, referrals, diagnostics and follow-ups. Dates use today in Asia/Kolkata. Rerunning refreshes the same demo records and resets their demo queue statuses; it does not delete records or change other accounts. API writes are not transactional; if interrupted, rerun to finish. The script verifies appointment and patient-name access with the newly created doctor's session.
