export type SupabaseConfig = {
  anonKey: string;
  isConfigured: boolean;
  url: string;
};

const FALLBACK_SUPABASE_URL = "https://example.supabase.co";
const FALLBACK_SUPABASE_ANON_KEY = "noted-local-placeholder-key";

export function getSupabaseConfig(): SupabaseConfig {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  let urlValid = false;
  if (url) {
    try {
      const { protocol } = new URL(url);
      urlValid = protocol === "https:" || protocol === "http:";
    } catch {
      urlValid = false;
    }
  }

  return {
    anonKey: anonKey || FALLBACK_SUPABASE_ANON_KEY,
    isConfigured: urlValid && Boolean(anonKey),
    url: urlValid ? url! : FALLBACK_SUPABASE_URL
  };
}

export function getSiteUrl(requestOrigin?: string | null): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    requestOrigin ||
    "http://localhost:3000"
  ).replace(/\/$/, "");
}
