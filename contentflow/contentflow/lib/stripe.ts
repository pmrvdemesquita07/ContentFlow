import Stripe from "stripe";

let stripeClient: Stripe | null = null;

/// Lazily constructed so importing this module never throws when
/// STRIPE_SECRET_KEY isn't set yet (e.g. during `next build`) - the error
/// only surfaces if a billing action/webhook actually runs without it.
export function getStripe(): Stripe {
  if (!stripeClient) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY is not configured.");
    }
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return stripeClient;
}

export type PaidPlan = "pro" | "studio";

/// Maps a paid plan to its Stripe recurring Price id, configured per
/// environment (Starter has no Stripe product - it's free, no checkout).
export const PLAN_PRICE_IDS: Record<PaidPlan, string | undefined> = {
  pro: process.env.STRIPE_PRICE_PRO,
  studio: process.env.STRIPE_PRICE_STUDIO,
};

export function planForPriceId(priceId: string | null | undefined): PaidPlan | null {
  if (!priceId) return null;
  if (priceId === PLAN_PRICE_IDS.pro) return "pro";
  if (priceId === PLAN_PRICE_IDS.studio) return "studio";
  return null;
}
