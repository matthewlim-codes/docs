"use client";

import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "@/lib/supabase/database.types";
import { getSupabaseConfig } from "@/lib/supabase/env";

export function createClient() {
  const { anonKey, url } = getSupabaseConfig();

  return createBrowserClient<Database>(url, anonKey);
}
