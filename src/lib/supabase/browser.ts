"use client";

import { createBrowserClient } from "@supabase/ssr";
import { getSupabasePublicConfig, isSupabaseConfigured } from "./config";

export function createSupabaseBrowserClient() {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured. Set the public Supabase URL and key.");
  }
  const { url, key } = getSupabasePublicConfig();
  return createBrowserClient(url, key);
}
