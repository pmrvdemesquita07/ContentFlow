"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getCurrentWorkspaceAndBrand } from "@/lib/workspace";
import { prisma } from "@/lib/db";
import { getStripe, PLAN_PRICE_IDS, type PaidPlan } from "@/lib/stripe";

function siteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

export async function createCheckoutSession(plan: PaidPlan) {
  const user = await requireUser();
  const ctx = await getCurrentWorkspaceAndBrand(user.id);
  if (!ctx) return { error: "No workspace found." };

  const priceId = PLAN_PRICE_IDS[plan];
  if (!priceId) {
    return { error: "Billing isn't configured yet - contact support." };
  }

  let checkoutUrl: string;
  try {
    const stripe = getStripe();

    let customerId = ctx.workspace.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { workspaceId: ctx.workspace.id },
      });
      customerId = customer.id;
      await prisma.workspace.update({
        where: { id: ctx.workspace.id },
        data: { stripeCustomerId: customerId },
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${siteUrl()}/settings?billing=success`,
      cancel_url: `${siteUrl()}/settings?billing=cancelled`,
      client_reference_id: ctx.workspace.id,
    });

    if (!session.url) return { error: "Could not start checkout." };
    checkoutUrl = session.url;
  } catch {
    return { error: "Could not reach Stripe. Try again in a moment." };
  }

  redirect(checkoutUrl);
}

export async function createPortalSession() {
  const user = await requireUser();
  const ctx = await getCurrentWorkspaceAndBrand(user.id);
  if (!ctx?.workspace.stripeCustomerId) return { error: "No billing account yet." };

  let portalUrl: string;
  try {
    const session = await getStripe().billingPortal.sessions.create({
      customer: ctx.workspace.stripeCustomerId,
      return_url: `${siteUrl()}/settings`,
    });
    portalUrl = session.url;
  } catch {
    return { error: "Could not reach Stripe. Try again in a moment." };
  }

  redirect(portalUrl);
}
