import { redirect } from "next/navigation";

import { AuthForm } from "@/components/auth/AuthForm";
import { createClient } from "@/lib/supabase/server";

export default async function SignupPage() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/onboarding");
  }

  return <AuthForm mode="signup" />;
}
