import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

import type { Database } from "@/lib/supabase/database.types";
import { getSupabaseConfig } from "@/lib/supabase/env";

export async function createClient() {
  const cookieStore = await cookies();
  const { anonKey, url } = getSupabaseConfig();

  return createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, options, value }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Components cannot write cookies; middleware refreshes sessions.
        }
      }
    }
  });
}
