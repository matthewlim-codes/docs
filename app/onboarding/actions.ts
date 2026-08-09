"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export type ProfileSetupState = {
  error?: string;
};

const USERNAME_PATTERN = /^[a-z0-9_.]{3,30}$/;

export async function createProfileAction(
  _previousState: ProfileSetupState,
  formData: FormData
): Promise<ProfileSetupState> {
  const username = String(formData.get("username") || "")
    .trim()
    .toLowerCase()
    .replace(/^@+/, "");
  const displayName = String(formData.get("display_name") || "").trim();
  const bio = String(formData.get("bio") || "").trim();
  const isPrivate = formData.get("is_private") === "on";

  if (!USERNAME_PATTERN.test(username)) {
    return {
      error: "Choose a username with 3-30 lowercase letters, numbers, underscores, or periods."
    };
  }

  if (!displayName || displayName.length > 80) {
    return {
      error: "Display name must be between 1 and 80 characters."
    };
  }

  if (bio.length > 280) {
    return {
      error: "Bio must be 280 characters or fewer."
    };
  }

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (existingProfile) {
    redirect("/app");
  }

  const { error } = await supabase.from("profiles").insert({
    bio,
    display_name: displayName,
    id: user.id,
    is_private: isPrivate,
    username
  });

  if (error) {
    if (error.code === "23505") {
      return {
        error: "That @username is already taken. Try another handle."
      };
    }

    return {
      error: error.message
    };
  }

  revalidatePath("/app");
  redirect("/app");
}
