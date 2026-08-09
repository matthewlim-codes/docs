# Noted

High-school social app combining Instagram-style user discovery with iMessage-inspired chat.

## Stack
- **Framework**: Next.js 16 (App Router, webpack mode)
- **Auth & DB**: Supabase (auth + Postgres with RLS)
- **Styling**: Tailwind CSS v3

## Running the app
The app is built first, then served in production mode:

```bash
npm run build   # compile
npm start -- --port 5000  # serve on port 5000
```

The `dev` script (`npm run dev`) uses `--webpack -H 0.0.0.0` and runs on port 3000 by default.

## Environment variables (required)
| Key | Where to get it |
|-----|----------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase project → Settings → API |
| `NEXT_PUBLIC_SITE_URL` | Set to your Replit dev domain for auth callbacks |

Without these, the app runs but auth/protected routes are skipped.

## Database migrations
Apply `supabase/migrations/` to your Supabase project before using auth or messaging features.

## Phase status
- ✅ Phase 1: Supabase auth, profiles, protected routes, onboarding
- ✅ Phase 2: Messaging app (ChatApp), disguise mode

## User preferences
