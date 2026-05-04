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
   - `VITE_SITE_URL`
5. Install + run:
   ```bash
   npm install
   npm run dev
   ```
6. In Supabase Authentication, enable Email auth and Google auth.
7. In Netlify, set the same environment variables under Project configuration > Environment variables. Netlify builds do not read your local `.env` file.
   - `VITE_SITE_URL=https://cold-stone-checklist.netlify.app`
8. Add the deployed site URL to Supabase Authentication > URL Configuration:
   - Site URL: `https://cold-stone-checklist.netlify.app`
   - Redirect URLs: `https://cold-stone-checklist.netlify.app/**`
   - Local development: `http://localhost:3000/**`
   - Optional Netlify previews: `https://**--cold-stone-checklist.netlify.app/**`
9. In Google Cloud Console, create a Web application OAuth client:
   - Authorized JavaScript origin: `https://cold-stone-checklist.netlify.app`
   - Authorized redirect URI: the callback URL shown on the Supabase Google provider page, usually `https://vigmrrkorkibifaembfv.supabase.co/auth/v1/callback`
10. Paste the Google Client ID and Client Secret into Supabase Authentication > Providers > Google.
11. Create the first owner auth account with `owner@example.com`, then change that employee email in the app to the real owner email.
12. Create or update employees in the app with their login email. Existing checklist history stays attached to the same employee row when they sign up with that email.

## Netlify
The repository includes `netlify.toml` for Netlify deploys:
- Build command: `npm run build`
- Publish directory: `dist`
- SPA fallback: all routes rewrite to `/index.html`

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
