# Noted

Noted is a high school web application that combines Instagram-style user
discovery with an iMessage-inspired chat interface, plus a Chromebook-friendly
camouflage mode.

## Implemented scope

- Supabase `profiles` table migration with Row Level Security.
- Email/password and Google SSO auth pages at `/login` and `/signup`.
- First-run onboarding at `/onboarding` to choose a unique `@username` and
  display name.
- Next proxy-protected private routes under `/app` and `/onboarding`.
- Dual-pane chat UI with conversations on the left and iMessage-style bubbles on
  the right.
- Supabase Realtime message, reaction, request, and read-state subscriptions.
- User discovery by `@username` or display name.
- Message requests for private profiles.
- Group chat creation with multiple selected users.
- Tapback reactions, typing indicators, and read receipts.
- Esc/double-Shift camouflage mode with Google Docs and VS Code/notes skins.
- Basic PWA manifest metadata.

## Local setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a Supabase project and apply both migrations in order:

   - `supabase/migrations/20260809010200_phase_1_profiles.sql`
   - `supabase/migrations/20260809014400_full_app_schema.sql`

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

## Replit preview setup

1. Add Replit Secrets:

   ```txt
   NEXT_PUBLIC_SUPABASE_URL
   NEXT_PUBLIC_SUPABASE_ANON_KEY
   NEXT_PUBLIC_SITE_URL
   ```

   Set `NEXT_PUBLIC_SITE_URL` to your Replit app URL once Replit shows it, for
   example `https://your-repl-name.your-username.replit.app`.

2. Run the two SQL migration files in Supabase SQL Editor. If you already ran
   Phase 1, run only `20260809014400_full_app_schema.sql`.

3. Click **Run** in Replit. The dev script uses:

   ```bash
   next dev --webpack -H 0.0.0.0
   ```

4. Open the Replit preview URL and visit `/signup`.

5. Create at least two test accounts in different browser sessions to verify
   realtime direct messages and requests.

## Verification

1. Visit `/signup`.
2. Create an account with email/password or Google SSO.
3. Complete `/onboarding` with a unique username and display name.
4. Search another user in Discover, click Message, and send a DM.
5. Mark a profile private and verify Message creates a request that can be
   accepted/declined.
6. Create a group chat with at least three users.
7. Double-click a message to add a tapback.
8. Type in another browser session and verify typing dots.
9. Press Esc or double-Shift and confirm the disguise overlay appears without
   losing chat state.
