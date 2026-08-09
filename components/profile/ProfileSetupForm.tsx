"use client";

import { useActionState } from "react";
import { AtSign, Lock, UserRound } from "lucide-react";

import {
  createProfileAction,
  type ProfileSetupState
} from "@/app/onboarding/actions";

const initialState: ProfileSetupState = {};

export function ProfileSetupForm() {
  const [state, formAction, isPending] = useActionState(
    createProfileAction,
    initialState
  );

  return (
    <form action={formAction} className="mt-8 space-y-5">
      <label className="block">
        <span className="text-sm font-semibold text-slate-700">Username</span>
        <div className="mt-2 flex rounded-2xl border border-slate-300 bg-white px-4 py-3 focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-100">
          <AtSign aria-hidden className="mr-2 h-5 w-5 flex-none text-slate-400" />
          <input
            autoComplete="username"
            className="w-full border-0 bg-transparent text-slate-950 outline-none"
            maxLength={30}
            minLength={3}
            name="username"
            pattern="[a-z0-9_.]{3,30}"
            placeholder="your_handle"
            required
            type="text"
          />
        </div>
        <span className="mt-2 block text-xs text-slate-500">
          Lowercase letters, numbers, underscores, and periods only.
        </span>
      </label>

      <label className="block">
        <span className="text-sm font-semibold text-slate-700">Display name</span>
        <div className="mt-2 flex rounded-2xl border border-slate-300 bg-white px-4 py-3 focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-100">
          <UserRound aria-hidden className="mr-2 h-5 w-5 flex-none text-slate-400" />
          <input
            autoComplete="name"
            className="w-full border-0 bg-transparent text-slate-950 outline-none"
            maxLength={80}
            name="display_name"
            placeholder="Your name"
            required
            type="text"
          />
        </div>
      </label>

      <label className="block">
        <span className="text-sm font-semibold text-slate-700">Bio</span>
        <textarea
          className="mt-2 min-h-28 w-full resize-none rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
          maxLength={280}
          name="bio"
          placeholder="A short intro for classmates who discover you later."
        />
      </label>

      <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <input
          className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          name="is_private"
          type="checkbox"
        />
        <span>
          <span className="flex items-center gap-2 text-sm font-semibold text-slate-800">
            <Lock aria-hidden className="h-4 w-4" />
            Private profile
          </span>
          <span className="mt-1 block text-sm leading-6 text-slate-600">
            Private profiles are readable only by you until later phases add
            social connections and message requests.
          </span>
        </span>
      </label>

      {state.error ? (
        <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </p>
      ) : null}

      <button
        className="w-full rounded-2xl bg-blue-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isPending}
        type="submit"
      >
        {isPending ? "Saving profile..." : "Finish setup"}
      </button>
    </form>
  );
}
