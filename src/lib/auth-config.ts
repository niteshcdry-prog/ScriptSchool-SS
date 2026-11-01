export function isAuthSignUpEnabled({
  captchaEnabled,
  signUpEnabled,
  siteKey,
}: {
  captchaEnabled: boolean;
  signUpEnabled: boolean;
  siteKey?: string;
}): boolean {
  return captchaEnabled && signUpEnabled && Boolean(siteKey);
}
