# Cold Stone Checklist

Employee checklist webapp for Cold Stone Creamery.

## Stack
- React + Vite
- Supabase
- Tailwind v4

## Launch today
1. Create a Supabase project.
2. In Supabase SQL editor, run `supabase/schema.sql`.
3. Run the SQL files in `supabase/migrations` in timestamp order, including `20260504160000_organizations_invites_onboarding.sql`.
4. Then run `supabase/seed.sql`.
5. Copy `.env.example` to `.env` and fill in:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_SITE_URL`
   - `VITE_PLATFORM_ADMIN_EMAILS`
6. Install + run:
   ```bash
   npm install
   npm run dev
   ```
7. In Supabase Authentication, enable Email auth and Google auth.
8. In Netlify, set the same environment variables under Project configuration > Environment variables. Netlify builds do not read your local `.env` file.
   - `VITE_SITE_URL=https://cold-stone-checklist.netlify.app`
   - `VITE_PLATFORM_ADMIN_EMAILS=you@example.com`
   - Optional invite email: `RESEND_API_KEY` and `INVITE_FROM_EMAIL`
9. Add the deployed site URL to Supabase Authentication > URL Configuration:
   - Site URL: `https://cold-stone-checklist.netlify.app`
   - Redirect URLs: `https://cold-stone-checklist.netlify.app/**`
   - Local development: `http://localhost:3000/**`
   - Optional Netlify previews: `https://**--cold-stone-checklist.netlify.app/**`
10. In Google Cloud Console, create a Web application OAuth client:
   - Authorized JavaScript origin: `https://cold-stone-checklist.netlify.app`
   - Authorized redirect URI: the callback URL shown on the Supabase Google provider page, usually `https://vigmrrkorkibifaembfv.supabase.co/auth/v1/callback`
11. Paste the Google Client ID and Client Secret into Supabase Authentication > Providers > Google.
12. Owners can create an organization from `/onboarding`.
13. Owners invite managers, and managers invite employees from Team admin. Existing checklist history is migrated into the default organization.

## Netlify
The repository includes `netlify.toml` for Netlify deploys:
- Build command: `npm run build`
- Publish directory: `dist`
- SPA fallback: all routes rewrite to `/index.html`
- Optional invite email endpoint: `/api/send-invite`

## Important notes
- Data persists in Supabase, so app updates/deploys will not wipe checklist history.
- Daily reset is handled by `daily_sessions.shift_date`, which keeps old days in history while new days start fresh.
- Supabase Auth handles email/password and Google login. Employees are linked to auth users by `employees.email` and `employees.auth_user_id`.
- Public visitors see the sales page at `/`; signed-in app work happens under `/app`.
- Google OAuth returns through `/auth/callback` so access tokens are not left in the visible URL.
- Owners create organizations, then invite managers and employees.

## What the current app supports
- Email/password login
- Google login
- public sales homepage
- owner organization onboarding
- manager and employee invite links
- Employee management
- Checklist completion
- Temperature entry
- Assignment flow
- History view
- Per-item and per-session timestamps

## Still worth improving after launch
- stricter role-based RLS policies that enforce manager-only admin writes at the database layer
- better audit log views
- exports / reports
- timezone hardening
- duplicate-session protection
- custom checklist editor
