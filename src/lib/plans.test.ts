import { describe, expect, it } from "vitest";
import {
  canAccessPremiumCourse,
  getPlanById,
  getPlanAccessState,
  hasPremiumAccess,
  isPremiumCourse,
  planCatalog,
  premiumCourseIds,
  resolveEffectivePlan,
} from "./plans";

describe("plans", () => {
  it("defaults unknown plans to free access", () => {
    expect(getPlanById("enterprise")).toBe("free");
    expect(getPlanById(null)).toBe("free");
  });

  it("marks premium courses and exposes plan definitions", () => {
    expect(isPremiumCourse("python-programming")).toBe(true);
    expect(isPremiumCourse("javascript-foundations")).toBe(false);
    expect(premiumCourseIds).toContain("sql-databases");
    expect(planCatalog.pro.label).toBe("Pro");
  });

  it("recognizes premium access and falls back correctly", () => {
    expect(hasPremiumAccess("pro")).toBe(true);
    expect(hasPremiumAccess("free")).toBe(false);
    expect(hasPremiumAccess("enterprise")).toBe(false);
  });

  it("resolves the effective plan from billing and admin overrides", () => {
    expect(resolveEffectivePlan({ plan: "free", billingState: "active", isAdmin: false })).toBe("pro");
    expect(resolveEffectivePlan({ plan: "pro", billingState: "inactive", isAdmin: false })).toBe("pro");
    expect(resolveEffectivePlan({ plan: "free", billingState: "inactive", isAdmin: true })).toBe("pro");
    expect(resolveEffectivePlan({ plan: "free", billingState: "inactive", isAdmin: false })).toBe("free");
  });

  it("returns a billing-aware premium access decision", () => {
    expect(canAccessPremiumCourse({ plan: "free", billingState: "active", isAdmin: false })).toBe(true);
    expect(canAccessPremiumCourse({ plan: "pro", billingState: "inactive", isAdmin: false })).toBe(true);
    expect(canAccessPremiumCourse({ plan: "free", billingState: "inactive", isAdmin: false })).toBe(false);
    expect(canAccessPremiumCourse({ plan: "free", billingState: "inactive", isAdmin: true })).toBe(true);
  });

  it("exposes the current plan access state for the UI", () => {
    expect(getPlanAccessState({ plan: "free", billingState: "active", isAdmin: false })).toEqual({
      plan: "pro",
      premiumAccess: true,
      isAdmin: false,
      billingActive: true,
    });
  });
});
