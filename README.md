# Noted

Noted is a high school web application that will combine Instagram-style user
discovery with an iMessage-inspired chat interface. This branch implements
Phase 1 only: Supabase authentication, profile persistence, and protected
routes.

## Phase 1 scope

- Supabase `profiles` table migration with Row Level Security.
- Email/password and Google SSO auth pages at `/login` and `/signup`.
- First-run onboarding at `/onboarding` to choose a unique `@username` and
  display name.
- Middleware-protected private routes under `/app` and `/onboarding`.
- A protected `/app` verification screen showing the persisted profile.

Messaging, user discovery, requests, group chat, reactions, typing indicators,
read receipts, and camouflage mode are intentionally not implemented yet.

## Local setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a Supabase project and apply the migration in
   `supabase/migrations/20260809010200_phase_1_profiles.sql`.

3. Copy `.env.example` to `.env.local` and fill in:

   ```bash
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   NEXT_PUBLIC_SITE_URL=http://localhost:3000
   ```

4. In Supabase Auth, enable Email/Password. For Google SSO, configure the
   Google provider and add `http://localhost:3000/auth/callback` to the allowed
   redirect URLs.

5. Run the app:

   ```bash
   npm run dev
   ```

## Phase 1 verification

1. Visit `/signup`.
2. Create an account with email/password or Google SSO.
3. Complete `/onboarding` with a unique username and display name.
4. Confirm `/app` shows the saved profile.
5. Log out, then log back in from `/login` and confirm the same profile data is
   shown.
