import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabasePublicConfig, isSupabaseConfigured } from "./config";

export async function createSupabaseServerClient() {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured. Set the public Supabase URL and key.");
  }
  const { url, key } = getSupabasePublicConfig();
  const cookieStore = await cookies();

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch (error) {
          if (!(error instanceof Error) || !error.message.startsWith("Cookies can only be modified in a Server Action or Route Handler.")) {
            throw error;
          }
          // Server Components cannot write cookies; proxy.ts refreshes the session and persists cookies.
        }
      },
    },
  });
}
