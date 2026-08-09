import { redirect } from "next/navigation";
import { LogOut, MessageCircle, ShieldCheck, UserRound } from "lucide-react";

import { createClient } from "@/lib/supabase/server";

export default async function AppPage() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, bio, is_private, created_at")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) {
    redirect("/onboarding");
  }

  return (
    <main className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="flex flex-col gap-4 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/70 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white">
              <MessageCircle aria-hidden className="h-8 w-8" />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">
                Noted Phase 1
              </p>
              <h1 className="text-3xl font-bold tracking-tight text-slate-950">
                Authentication foundation
              </h1>
            </div>
          </div>
          <form action="/auth/signout" method="post">
            <button
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
              type="submit"
            >
              <LogOut aria-hidden className="h-4 w-4" />
              Log out
            </button>
          </form>
        </header>

        <section className="mt-8 grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
          <article className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/70">
            <div className="flex items-center gap-4">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                {profile.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    alt=""
                    className="h-full w-full rounded-full object-cover"
                    src={profile.avatar_url}
                  />
                ) : (
                  <UserRound aria-hidden className="h-10 w-10" />
                )}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-950">
                  {profile.display_name}
                </h2>
                <p className="text-sm font-semibold text-blue-600">
                  @{profile.username}
                </p>
              </div>
            </div>

            <p className="mt-6 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">
              {profile.bio || "No bio yet."}
            </p>

            <dl className="mt-6 space-y-3 text-sm">
              <div className="flex items-center justify-between gap-4">
                <dt className="text-slate-500">Email</dt>
                <dd className="font-medium text-slate-900">{user.email}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-slate-500">Visibility</dt>
                <dd className="font-medium text-slate-900">
                  {profile.is_private ? "Private" : "Public"}
                </dd>
              </div>
            </dl>
          </article>

          <article className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/70">
            <div className="flex items-center gap-3">
              <ShieldCheck aria-hidden className="h-6 w-6 text-blue-600" />
              <h2 className="text-xl font-bold text-slate-950">
                Phase 1 verification checklist
              </h2>
            </div>
            <ul className="mt-6 space-y-4 text-sm leading-6 text-slate-700">
              <li className="rounded-2xl border border-green-100 bg-green-50 p-4">
                Supabase Auth session is active and protected by middleware.
              </li>
              <li className="rounded-2xl border border-green-100 bg-green-50 p-4">
                A persistent profile row exists for the authenticated user.
              </li>
              <li className="rounded-2xl border border-green-100 bg-green-50 p-4">
                RLS policies allow public profile reads and restrict profile
                creation, updates, and deletion to the owning user.
              </li>
            </ul>
            <p className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800">
              Messaging, discovery, requests, group chats, and stealth mode are
              intentionally excluded until later phases.
            </p>
          </article>
        </section>
      </div>
    </main>
  );
}
