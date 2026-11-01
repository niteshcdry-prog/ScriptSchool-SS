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

const authCaptchaEnabled = env.NEXT_PUBLIC_AUTH_CAPTCHA_ENABLED === "true";
const authSignUpEnabled = env.NEXT_PUBLIC_AUTH_SIGNUP_ENABLED === "true";

if (authCaptchaEnabled && !env.NEXT_PUBLIC_TURNSTILE_SITE_KEY) {
  console.error("NEXT_PUBLIC_TURNSTILE_SITE_KEY is required when authentication CAPTCHA is enabled.");
  process.exit(1);
}

if (authSignUpEnabled && (!authCaptchaEnabled || !env.NEXT_PUBLIC_TURNSTILE_SITE_KEY)) {
  console.error("Public account creation requires authentication CAPTCHA and a Turnstile site key.");
  process.exit(1);
}

if (!authSignUpEnabled) {
  console.warn("Public account creation is disabled; enable it only after staging authentication is verified.");
}

console.log("Environment configuration looks valid for local Supabase integration.");
