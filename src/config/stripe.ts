import Stripe from "stripe";
import { env } from "./env";
import { logger } from "./logger";

export const stripeEnabled = !!env.STRIPE_SECRET_KEY;

export const stripe = stripeEnabled
  ? new Stripe(env.STRIPE_SECRET_KEY as string)
  : null;

if (!stripeEnabled)
  logger.warn("STRIPE_SECRET_KEY not set — Stripe checkout disabled");
