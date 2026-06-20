import type Stripe from "stripe";
import { stripe } from "@/config/stripe";
import { env } from "@/config/env";
import { logger } from "@/config/logger";
import { Payment, Subscription, User, sequelize } from "@/models";
import { applyCredits } from "./credits.service";
import { resolveCheckout } from "@/constants/plans";
import { AppError } from "@/utils/app-error";
import type { PaymentKind, PaymentProvider, Plan } from "@/types";

interface CheckoutInput {
  kind: "subscription" | "topup";
  planId?: Plan;
  credits?: number;
}

/**
 * Idempotently record a successful payment, grant the credits, and (for subscriptions)
 * activate the plan. Safe to call multiple times for the same provider+ref (webhook retries).
 */
export async function grantForPayment(input: {
  userId: string;
  provider: PaymentProvider;
  providerRef: string;
  kind: PaymentKind;
  planId?: Plan;
  credits: number;
  amountUsd: number;
  subscriptionId?: string | null;
}): Promise<void> {
  const existing = await Payment.findOne({
    where: { provider: input.provider, providerRef: input.providerRef },
  });
  if (existing && existing.status === "succeeded") return; // already processed

  await sequelize.transaction(async (t) => {
    if (existing) {
      existing.status = "succeeded";
      existing.creditsGranted = input.credits;
      await existing.save({ transaction: t });
    } else {
      await Payment.create(
        {
          userId: input.userId,
          provider: input.provider,
          providerRef: input.providerRef,
          kind: input.kind,
          amountUsd: input.amountUsd,
          creditsGranted: input.credits,
          status: "succeeded",
          metadata: {
            planId: input.planId ?? null,
            subscriptionId: input.subscriptionId ?? null,
          },
        },
        { transaction: t },
      );
    }

    await applyCredits(
      input.userId,
      input.credits,
      {
        kind: input.kind === "subscription" ? "grant" : "topup",
        description:
          input.kind === "subscription"
            ? `${input.planId ?? "plan"} plan — monthly credits`
            : `Top-up — ${input.credits.toLocaleString()} credits`,
        refType: input.kind === "subscription" ? "subscription" : "payment",
      },
      t,
    );

    if (
      input.kind === "subscription" &&
      (input.planId === "pro" || input.planId === "premium")
    ) {
      const user = await User.findByPk(input.userId, { transaction: t });
      if (user) {
        user.plan = input.planId;
        await user.save({ transaction: t });
      }
      if (input.subscriptionId) {
        const [sub] = await Subscription.findOrCreate({
          where: {
            provider: input.provider,
            providerSubscriptionId: input.subscriptionId,
          },
          defaults: {
            userId: input.userId,
            plan: input.planId,
            status: "active",
            provider: input.provider,
            providerSubscriptionId: input.subscriptionId,
          },
          transaction: t,
        });
        sub.status = "active";
        sub.plan = input.planId;
        await sub.save({ transaction: t });
      }
    }
  });
  logger.info(
    `Payment granted: ${input.credits} cr → user ${input.userId} (${input.provider} ${input.kind})`,
  );
}

/** Cancel/downgrade — keep leftover credits (per product decision). */
export async function downgradeSubscription(
  provider: PaymentProvider,
  providerSubscriptionId: string,
): Promise<void> {
  const sub = await Subscription.findOne({
    where: { provider, providerSubscriptionId },
  });
  if (!sub) return;
  sub.status = "canceled";
  await sub.save();
  const user = await User.findByPk(sub.userId);
  if (user) {
    user.plan = "free";
    await user.save();
  }
  logger.info(
    `Subscription ${providerSubscriptionId} canceled → user ${sub.userId} downgraded`,
  );
}

/* ── Stripe ── */
export async function createStripeCheckout(
  user: User,
  input: CheckoutInput,
): Promise<string> {
  if (!stripe)
    throw new AppError(
      503,
      "stripe_unavailable",
      "Card payments aren't configured yet",
    );
  const { amountUsd, credits, label } = resolveCheckout(input);
  const mode = input.kind === "subscription" ? "subscription" : "payment";
  const metadata = {
    userId: user.id,
    kind: input.kind,
    planId: input.planId ?? "",
    credits: String(credits),
  };
  const session = await stripe.checkout.sessions.create({
    mode,
    customer_email: user.email,
    line_items: [
      {
        price_data: {
          currency: "usd",
          unit_amount: Math.round(amountUsd * 100),
          ...(mode === "subscription"
            ? { recurring: { interval: "month" as const } }
            : {}),
          product_data: { name: label },
        },
        quantity: 1,
      },
    ],
    success_url: `${env.APP_URL}/billing?status=success`,
    cancel_url: `${env.APP_URL}/billing?status=cancelled`,
    metadata,
    ...(mode === "subscription" ? { subscription_data: { metadata } } : {}),
  });
  if (!session.url)
    throw new AppError(
      502,
      "stripe_error",
      "Stripe did not return a checkout URL",
    );
  return session.url;
}

export async function handleStripeEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case "checkout.session.completed": {
      const s = event.data.object as Stripe.Checkout.Session;
      const md = s.metadata ?? {};
      if (!md.userId) return;
      await grantForPayment({
        userId: md.userId,
        provider: "stripe",
        providerRef: s.id,
        kind: (md.kind as PaymentKind) ?? "topup",
        planId: (md.planId || undefined) as Plan | undefined,
        credits: Number(md.credits ?? 0),
        amountUsd: (s.amount_total ?? 0) / 100,
        subscriptionId:
          typeof s.subscription === "string" ? s.subscription : null,
      });
      break;
    }
    case "invoice.paid": {
      const inv = event.data.object as Stripe.Invoice;
      if (inv.billing_reason !== "subscription_cycle") return; // first invoice handled at checkout
      const md = (inv.subscription_details?.metadata ?? {}) as Record<
        string,
        string
      >;
      if (!md.userId) return;
      await grantForPayment({
        userId: md.userId,
        provider: "stripe",
        providerRef: inv.id ?? `inv_${Date.now()}`,
        kind: "subscription",
        planId: md.planId as Plan,
        credits: Number(md.credits ?? 0),
        amountUsd: (inv.amount_paid ?? 0) / 100,
        subscriptionId:
          typeof inv.subscription === "string" ? inv.subscription : null,
      });
      break;
    }
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      await downgradeSubscription("stripe", sub.id);
      break;
    }
    default:
      break;
  }
}

/* ── Dubu Pay (Business API: POST /checkout-links, X-Api-Key auth) ── */
export async function createDubuCheckout(
  user: User,
  input: CheckoutInput,
): Promise<string> {
  if (!env.DUBU_API_BASE || !env.DUBU_API_KEY) {
    throw new AppError(
      503,
      "dubu_unavailable",
      "Dubu Pay isn't configured yet",
    );
  }
  const { amountUsd, credits, label } = resolveCheckout(input);
  const res = await fetch(`${env.DUBU_API_BASE}/checkout-links`, {
    method: "POST",
    headers: {
      "X-Api-Key": env.DUBU_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title: label,
      type: "one_time",
      currency: "USD",
      amount: amountUsd,
      redirect_url: `${env.APP_URL}/billing?status=success`,
      success_message:
        "Payment received — credits added to your Dromo account.",
    }),
  });
  if (!res.ok) {
    throw new AppError(
      502,
      "dubu_error",
      `Dubu checkout failed: ${res.status} ${await res.text()}`,
    );
  }
  const body = (await res.json()) as {
    data?: Record<string, unknown>;
  } & Record<string, unknown>;
  const link = (body.data ?? body) as Record<string, unknown>;
  const ref = String(link.id ?? link.slug ?? "");
  const url =
    (link.url as string) ??
    (link.checkout_url as string) ??
    (link.slug && env.DUBU_CHECKOUT_URL
      ? `${env.DUBU_CHECKOUT_URL}/${link.slug}`
      : "");
  if (!ref || !url)
    throw new AppError(
      502,
      "dubu_error",
      "Dubu did not return a usable checkout link",
    );

  // Pending payment so the webhook can reconcile + grant.
  await Payment.create({
    userId: user.id,
    provider: "dubu",
    providerRef: ref,
    kind: input.kind,
    amountUsd,
    creditsGranted: credits,
    status: "pending",
    metadata: { planId: input.planId ?? null },
  });
  return url;
}

export async function handleDubuEvent(payload: any): Promise<void> {
  const data = payload?.data ?? payload ?? {};
  const status = String(payload?.event ?? payload?.type ?? data?.status ?? "");
  const ref = String(
    data?.checkout_link_id ??
      data?.checkoutLinkId ??
      data?.reference ??
      data?.id ??
      "",
  );
  if (!/paid|success|complete/i.test(status) || !ref) return;
  const payment = await Payment.findOne({
    where: { provider: "dubu", providerRef: ref },
  });
  if (!payment || payment.status === "succeeded") return;
  const planId =
    (payment.metadata as { planId?: Plan } | null)?.planId ?? undefined;
  await grantForPayment({
    userId: payment.userId,
    provider: "dubu",
    providerRef: ref,
    kind: payment.kind,
    planId,
    credits: payment.creditsGranted,
    amountUsd: Number(payment.amountUsd),
  });
}

export async function createCheckout(
  user: User,
  input: CheckoutInput & { method: "stripe" | "dubu" },
): Promise<{ url: string }> {
  const url =
    input.method === "dubu"
      ? await createDubuCheckout(user, input)
      : await createStripeCheckout(user, input);
  return { url };
}
