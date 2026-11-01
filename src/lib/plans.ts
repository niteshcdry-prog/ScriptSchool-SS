export type PlanId = "free" | "pro";

export type AccountPlanValue = string | null | undefined;

export type BillingState = "active" | "inactive" | "trial" | "pending" | "cancelled";

export type PlanDefinition = {
  id: PlanId;
  label: string;
  priceLabel: string;
  summary: string;
  includes: string[];
};

export type PlanAccessInput = {
  plan?: AccountPlanValue;
  billingState?: BillingState | null;
  isAdmin?: boolean;
};

export type PlanAccessState = {
  plan: PlanId;
  premiumAccess: boolean;
  isAdmin: boolean;
  billingActive: boolean;
};

export const planCatalog: Record<PlanId, PlanDefinition> = {
  free: {
    id: "free",
    label: "Free",
    priceLabel: "$0",
    summary: "A strong starter plan with beginner-friendly core lessons to build momentum.",
    includes: ["JavaScript foundations", "Progress tracking", "Lesson streaks"],
  },
  pro: {
    id: "pro",
    label: "Pro",
    priceLabel: "Coming soon",
    summary: "Unlock the full catalog with an active subscription.",
    includes: ["Full course catalog", "Premium course access", "Subscription-ready access control"],
  },
};

export const premiumCourseIds = [
  "python-programming",
  "web-development",
  "git-github",
  "sql-databases",
] as const;

export function isPremiumCourse(courseId: string): boolean {
  return premiumCourseIds.includes(courseId as (typeof premiumCourseIds)[number]);
}

export function getPlanById(value: AccountPlanValue): PlanId {
  return value === "pro" ? "pro" : "free";
}

export function resolveEffectivePlan({
  plan,
  billingState,
  isAdmin = false,
}: PlanAccessInput): PlanId {
  if (isAdmin) return "pro";

  const basePlan = getPlanById(plan);
  if (billingState && ["active", "trial", "pending"].includes(billingState)) {
    return "pro";
  }

  return basePlan;
}

export function canAccessPremiumCourse({
  plan,
  billingState,
  isAdmin = false,
}: PlanAccessInput): boolean {
  return resolveEffectivePlan({ plan, billingState, isAdmin }) === "pro";
}

export function getPlanAccessState({
  plan,
  billingState,
  isAdmin = false,
}: PlanAccessInput): PlanAccessState {
  const effectivePlan = resolveEffectivePlan({ plan, billingState, isAdmin });
  const billingActive = billingState !== null && billingState !== undefined && ["active", "trial", "pending"].includes(billingState);
  return {
    plan: effectivePlan,
    premiumAccess: effectivePlan === "pro",
    isAdmin,
    billingActive,
  };
}

export function hasPremiumAccess(plan: AccountPlanValue): boolean {
  return getPlanById(plan) === "pro";
}
