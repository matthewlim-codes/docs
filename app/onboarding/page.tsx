import { redirect } from "next/navigation";
import { BadgeCheck, MessageCircle } from "lucide-react";

import { ProfileSetupForm } from "@/components/profile/ProfileSetupForm";
import { createClient } from "@/lib/supabase/server";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (profile) {
    redirect("/app");
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <section className="w-full max-w-2xl rounded-[2rem] border border-slate-200 bg-white p-6 shadow-2xl shadow-slate-200/80 sm:p-10">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white">
            <MessageCircle aria-hidden className="h-7 w-7" />
          </div>
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">
              Profile setup
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-slate-950">
              Choose your Noted identity
            </h1>
          </div>
        </div>

        <div className="mt-8 rounded-3xl border border-blue-100 bg-blue-50 p-5 text-blue-950">
          <div className="flex items-center gap-3 text-sm font-semibold">
            <BadgeCheck aria-hidden className="h-5 w-5" />
            Signed in as {user.email}
          </div>
          <p className="mt-2 text-sm leading-6 text-blue-800">
            This creates one profile row tied to your Supabase auth user. Your
            unique @username is what classmates will search in Phase 3.
          </p>
        </div>

        <ProfileSetupForm />
      </section>
    </main>
  );
}
