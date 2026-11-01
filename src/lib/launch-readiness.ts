export type LaunchReadinessStatus = "ready" | "pending" | "watch";

export type LaunchReadinessCheck = {
  id: string;
  title: string;
  detail: string;
  status: LaunchReadinessStatus;
};

export type LaunchReadinessSummary = {
  score: number;
  headline: string;
  checks: LaunchReadinessCheck[];
};

export function getLaunchReadiness({
  hasStagingReview,
  hasMonitoring,
  hasBackupPolicy,
  hasBillingLayer,
}: {
  hasStagingReview: boolean;
  hasMonitoring: boolean;
  hasBackupPolicy: boolean;
  hasBillingLayer: boolean;
}): LaunchReadinessSummary {
  const checks: LaunchReadinessCheck[] = [
    {
      id: "staging",
      title: "Staging verification",
      detail: hasStagingReview ? "Sign-up, auth, and curriculum checks are verified in a staging environment." : "Validate auth, lesson flows, and role checks before opening sign-ups.",
      status: hasStagingReview ? "ready" : "pending",
    },
    {
      id: "monitoring",
      title: "Operational monitoring",
      detail: hasMonitoring ? "Health checks and alerting are configured for production review." : "Add uptime alerts and a health-check owner before launch.",
      status: hasMonitoring ? "ready" : "watch",
    },
    {
      id: "backup",
      title: "Recovery plan",
      detail: hasBackupPolicy ? "Database backups and restore drills are scheduled and owned." : "Set backup retention and a recovery drill before public launch.",
      status: hasBackupPolicy ? "ready" : "pending",
    },
    {
      id: "billing",
      title: "Billing and access",
      detail: hasBillingLayer ? "Subscriptions and plan enforcement are backed by a billing provider." : "Keep the current local gating layer while you validate the billing-ready model.",
      status: hasBillingLayer ? "ready" : "watch",
    },
  ];

  const weightedScore = checks.reduce((total, check) => {
    if (check.status === "ready") return total + 25;
    if (check.status === "watch") return total + 15;
    return total + 10;
  }, 0);

  const headline = weightedScore >= 80
    ? "Launch checklist is in good shape"
    : weightedScore >= 60
      ? "A few launch guardrails still need closure"
      : "Staging review is still the priority";

  return {
    score: Math.min(Math.round(weightedScore), 100),
    headline,
    checks,
  };
}
