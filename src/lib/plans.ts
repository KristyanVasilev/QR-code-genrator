// Абонаментни планове — източник на истината за приложението.
// Лимитите се дублират умишлено в SQL (supabase/migrations, функциите
// plan_max_qr_codes / plan_allows_dynamic) като предпазна мрежа на ниво база.
// При промяна тук обновете и миграцията.

/** "free" = няма активен абонамент (не може да създава и сваля кодове) */
export type PlanId = "free" | "starter" | "pro" | "business";
export type PaidPlanId = Exclude<PlanId, "free">;

export interface PlanLimits {
  /** null = без ограничение */
  maxQrCodes: number | null;
  dynamicCodes: boolean;
  analytics: boolean;
  customDesign: boolean;
}

export interface Plan {
  id: PlanId;
  /** Търговско име (не се превежда). Описанията са в речниците: plans.<id> */
  name: string;
  /** Месечна цена в евро — само за показване; реалната цена е в Stripe */
  priceMonthly: number;
  limits: PlanLimits;
}

/** Платен пробен период — само за Starter и само веднъж на профил */
export const TRIAL = { plan: "starter" as const, days: 14, price: 1.99 };

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: "free",
    name: "—",
    priceMonthly: 0,
    limits: { maxQrCodes: 0, dynamicCodes: false, analytics: false, customDesign: false },
  },
  starter: {
    id: "starter",
    name: "Starter",
    priceMonthly: 5,
    limits: { maxQrCodes: 5, dynamicCodes: false, analytics: false, customDesign: false },
  },
  pro: {
    id: "pro",
    name: "Pro",
    priceMonthly: 7,
    limits: { maxQrCodes: 50, dynamicCodes: true, analytics: true, customDesign: true },
  },
  business: {
    id: "business",
    name: "Business",
    priceMonthly: 15,
    limits: { maxQrCodes: null, dynamicCodes: true, analytics: true, customDesign: true },
  },
};

export const PAID_PLANS = [PLANS.starter, PLANS.pro, PLANS.business];

export const isPaidPlan = (id: unknown): id is PaidPlanId => id === "starter" || id === "pro" || id === "business";

/** Статуси на Stripe абонамент, при които платеният план е активен.
 *  past_due се приема за активен, докато Stripe опитва повторно плащане. */
const ACTIVE_STATUSES = new Set(["active", "trialing", "past_due"]);

export function effectivePlan(plan: string | null | undefined, status: string | null | undefined): PlanId {
  return isPaidPlan(plan) && status && ACTIVE_STATUSES.has(status) ? plan : "free";
}

/** Има ли право да вижда, сваля и редактира кодовете си */
export const hasAccess = (planId: PlanId) => planId !== "free";

export function canCreateQr(planId: PlanId, currentCount: number) {
  const max = PLANS[planId].limits.maxQrCodes;
  return max === null || currentCount < max;
}

/** Дни, през които кодовете се пазят след прекратяване на абонамента */
export const RETENTION_DAYS = 30;
