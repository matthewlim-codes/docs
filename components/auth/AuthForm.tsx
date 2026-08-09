"use client";

import Link from "next/link";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { Mail, MessageCircle, ShieldCheck } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { getSupabaseConfig } from "@/lib/supabase/env";

type AuthFormProps = {
  mode: "login" | "signup";
  redirectTo?: string;
};

function getSafeRedirect(path?: string) {
  if (!path || !path.startsWith("/") || path.startsWith("//")) {
    return "/app";
  }

  return path;
}

export function AuthForm({ mode, redirectTo }: AuthFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const safeRedirect = getSafeRedirect(redirectTo);
  const supabaseConfig = useMemo(() => getSupabaseConfig(), []);
  const isSignup = mode === "signup";

  async function handleEmailAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (!supabaseConfig.isConfigured) {
      setError("Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY before signing in.");
      return;
    }

    setIsPending(true);
    const supabase = createClient();

    if (isSignup) {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`
        },
        password
      });

      setIsPending(false);

      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      if (data.session) {
        router.push("/onboarding");
        router.refresh();
        return;
      }

      setMessage("Check your email to confirm your account, then return to choose your @username.");
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    setIsPending(false);

    if (signInError) {
      setError(signInError.message);
      return;
    }

    router.push(safeRedirect as Route);
    router.refresh();
  }

  async function handleGoogleAuth() {
    setError(null);
    setMessage(null);

    if (!supabaseConfig.isConfigured) {
      setError("Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY before using Google SSO.");
      return;
    }

    setIsPending(true);
    const supabase = createClient();
    const callbackUrl = new URL("/auth/callback", window.location.origin);
    callbackUrl.searchParams.set("next", safeRedirect);

    const { error: googleError } = await supabase.auth.signInWithOAuth({
      options: {
        redirectTo: callbackUrl.toString()
      },
      provider: "google"
    });

    if (googleError) {
      setError(googleError.message);
      setIsPending(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-4 py-10">
      <div className="grid w-full overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl shadow-slate-200/80 md:grid-cols-[1.1fr_0.9fr]">
        <section className="hidden bg-slate-950 p-10 text-white md:flex md:flex-col md:justify-between">
          <div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500">
              <MessageCircle aria-hidden className="h-7 w-7" />
            </div>
            <h1 className="mt-8 max-w-md text-4xl font-bold tracking-tight">
              Noted starts with secure identities.
            </h1>
            <p className="mt-4 max-w-md text-base leading-7 text-slate-300">
              Phase 1 establishes Supabase authentication, sessions, and persistent
              public/private profile records before messaging is added.
            </p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/10 p-5">
            <div className="flex items-center gap-3 text-sm font-semibold">
              <ShieldCheck aria-hidden className="h-5 w-5 text-blue-300" />
              Protected Chromebook-ready foundation
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              Private routes are guarded by middleware and every profile write is
              enforced by Supabase Row Level Security.
            </p>
          </div>
        </section>

        <section className="p-6 sm:p-10">
          <div className="mx-auto max-w-md">
            <div className="mb-8 md:hidden">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500 text-white">
                <MessageCircle aria-hidden className="h-7 w-7" />
              </div>
            </div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">
              {isSignup ? "Create account" : "Welcome back"}
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
              {isSignup ? "Sign up for Noted" : "Log in to Noted"}
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              {isSignup
                ? "Use email/password or Google SSO, then choose your unique @username."
                : "Continue with your Supabase account to access your profile."}
            </p>

            <button
              className="mt-8 flex w-full items-center justify-center gap-3 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isPending}
              onClick={handleGoogleAuth}
              type="button"
            >
              <Mail aria-hidden className="h-5 w-5" />
              Continue with Google
            </button>

            <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-[0.2em] text-slate-400">
              <span className="h-px flex-1 bg-slate-200" />
              or
              <span className="h-px flex-1 bg-slate-200" />
            </div>

            <form className="space-y-4" onSubmit={handleEmailAuth}>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Email</span>
                <input
                  autoComplete="email"
                  className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@school.edu"
                  required
                  type="email"
                  value={email}
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Password</span>
                <input
                  autoComplete={isSignup ? "new-password" : "current-password"}
                  className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  minLength={6}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="At least 6 characters"
                  required
                  type="password"
                  value={password}
                />
              </label>

              {error ? (
                <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </p>
              ) : null}
              {message ? (
                <p className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
                  {message}
                </p>
              ) : null}

              <button
                className="w-full rounded-2xl bg-blue-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isPending}
                type="submit"
              >
                {isPending ? "Working..." : isSignup ? "Create account" : "Log in"}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-600">
              {isSignup ? "Already have an account?" : "Need an account?"}{" "}
              <Link
                className="font-semibold text-blue-600 hover:text-blue-700"
                href={isSignup ? "/login" : "/signup"}
              >
                {isSignup ? "Log in" : "Sign up"}
              </Link>
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
