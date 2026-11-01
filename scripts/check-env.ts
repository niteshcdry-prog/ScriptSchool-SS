import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const requiredKeys = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
] as const;

function readEnvFile(filePath: string): Record<string, string> {
  if (!existsSync(filePath)) return {};

  const result: Record<string, string> = {};
  for (const line of readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();
    result[key] = value.replace(/^['"]|['"]$/g, "");
  }

  return result;
}

const envPath = resolve(process.cwd(), ".env.local");
const env = {
  ...readEnvFile(envPath),
  ...process.env,
};

const missingKeys = requiredKeys.filter((key) => !env[key] || env[key] === "");

if (missingKeys.length > 0) {
  console.error("Missing required environment variables:");
  for (const key of missingKeys) {
    console.error(`- ${key}`);
  }
  process.exit(1);
}

if (env.NEXT_PUBLIC_AUTH_CAPTCHA_ENABLED === "true" && !env.NEXT_PUBLIC_TURNSTILE_SITE_KEY) {
  console.error("NEXT_PUBLIC_TURNSTILE_SITE_KEY is required when authentication CAPTCHA is enabled.");
  process.exit(1);
}

if (env.NEXT_PUBLIC_AUTH_CAPTCHA_ENABLED !== "true") {
  console.warn("Authentication CAPTCHA is not enabled; public account creation remains unavailable.");
}

console.log("Environment configuration looks valid for local Supabase integration.");
