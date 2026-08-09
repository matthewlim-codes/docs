import { redirect } from "next/navigation";

import { AuthForm } from "@/components/auth/AuthForm";
import { createClient } from "@/lib/supabase/server";

type LoginPageProps = {
  searchParams: Promise<{
    next?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/app");
  }

  const params = await searchParams;

  return <AuthForm mode="login" redirectTo={params.next} />;
}
