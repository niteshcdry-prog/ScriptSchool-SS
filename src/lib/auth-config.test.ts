import { describe, expect, it } from "vitest";
import { isAuthSignUpEnabled } from "./auth-config";

describe("isAuthSignUpEnabled", () => {
  it("requires CAPTCHA, its site key, and the explicit sign-up flag", () => {
    expect(isAuthSignUpEnabled({ captchaEnabled: true, signUpEnabled: true, siteKey: "site-key" })).toBe(true);
    expect(isAuthSignUpEnabled({ captchaEnabled: false, signUpEnabled: true, siteKey: "site-key" })).toBe(false);
    expect(isAuthSignUpEnabled({ captchaEnabled: true, signUpEnabled: false, siteKey: "site-key" })).toBe(false);
    expect(isAuthSignUpEnabled({ captchaEnabled: true, signUpEnabled: true })).toBe(false);
  });
});
