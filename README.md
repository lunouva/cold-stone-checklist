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
6. Login with starter PIN:
   - Owner / `1234`

## Important notes
- Data persists in Supabase, so app updates/deploys will not wipe checklist history.
- Daily reset is handled by `daily_sessions.shift_date`, which keeps old days in history while new days start fresh.
- Current launch-day security is intentionally loose so the app works fast with PIN-only access. Tighten RLS/auth later.

## What the current app supports
- PIN login
- Employee management
- Checklist completion
- Temperature entry
- Assignment flow
- History view
- Per-item and per-session timestamps

## Still worth improving after launch
- real auth / tighter security
- better audit log views
- exports / reports
- timezone hardening
- duplicate-session protection
- custom checklist editor
