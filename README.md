# Cold Stone Checklist

Employee checklist webapp for Cold Stone Creamery.

## Stack
- React + Vite
- Supabase
- Tailwind v4

## Launch today
1. Create a Supabase project.
2. In Supabase SQL editor, run `supabase/schema.sql`.
3. Then run `supabase/seed.sql`.
4. Copy `.env.example` to `.env` and fill in:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Install + run:
   ```bash
   npm install
   npm run dev
   ```
6. In Supabase Authentication, enable Email auth and Google auth.
7. Add the deployed site URL to Authentication > URL Configuration > Redirect URLs.
8. Create the first owner auth account with `owner@example.com`, then change that employee email in the app to the real owner email.
9. Create or update employees in the app with their login email. Existing checklist history stays attached to the same employee row when they sign up with that email.

## Important notes
- Data persists in Supabase, so app updates/deploys will not wipe checklist history.
- Daily reset is handled by `daily_sessions.shift_date`, which keeps old days in history while new days start fresh.
- Supabase Auth handles email/password and Google login. Employees are linked to auth users by `employees.email` and `employees.auth_user_id`.

## What the current app supports
- Email/password login
- Google login
- Employee management
- Checklist completion
- Temperature entry
- Assignment flow
- History view
- Per-item and per-session timestamps

## Still worth improving after launch
- role-based RLS policies that enforce manager-only admin writes at the database layer
- better audit log views
- exports / reports
- timezone hardening
- duplicate-session protection
- custom checklist editor
