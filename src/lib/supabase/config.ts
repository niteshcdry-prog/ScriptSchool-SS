import { z } from "zod";

const urlSchema = z.string().url();

export function isSupabaseConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export function isSupabaseAdminConfigured(): boolean {
  return isSupabaseConfigured() && Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function getSupabasePublicConfig() {
  const url = urlSchema.parse(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const key = z.string().min(1).parse(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  return { url, key };
}

export function getSupabaseServiceKey(): string {
  return z.string().min(1).parse(process.env.SUPABASE_SERVICE_ROLE_KEY);
}
