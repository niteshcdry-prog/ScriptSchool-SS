import { describe, expect, it } from "vitest";
import { getLaunchReadiness } from "./launch-readiness";

describe("getLaunchReadiness", () => {
  it("reports a strong but not completely finished launch checklist", () => {
    const result = getLaunchReadiness({
      hasStagingReview: true,
      hasMonitoring: true,
      hasBackupPolicy: false,
      hasBillingLayer: false,
    });

    expect(result.score).toBe(75);
    expect(result.headline).toContain("A few launch guardrails still need closure");
    expect(result.checks.some((check) => check.id === "backup" && check.status === "pending")).toBe(true);
  });

  it("marks the launch as fully ready when all key checks are in place", () => {
    const result = getLaunchReadiness({
      hasStagingReview: true,
      hasMonitoring: true,
      hasBackupPolicy: true,
      hasBillingLayer: true,
    });

    expect(result.score).toBe(100);
    expect(result.headline).toContain("Launch checklist is in good shape");
    expect(result.checks.every((check) => check.status === "ready")).toBe(true);
  });
});
