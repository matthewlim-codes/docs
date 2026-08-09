import { redirect } from "next/navigation";

import { ChatApp } from "@/components/app/ChatApp";
import { DisguiseProvider } from "@/components/disguise/DisguiseProvider";
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
    <DisguiseProvider>
      <ChatApp
        currentUser={{
          email: user.email || null,
          id: user.id
        }}
        profile={profile}
      />
    </DisguiseProvider>
  );
}
