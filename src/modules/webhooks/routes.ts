import { Router, type Request, type Response } from "express";
import crypto from "crypto";
import { stripe } from "@/config/stripe";
import { env } from "@/config/env";
import { logger } from "@/config/logger";
import {
  handleDubuEvent,
  handleStripeEvent,
} from "@/services/payments.service";

// Mounted with express.raw() (see app.ts) so req.body is the raw Buffer for signature verification.
export const webhooksRouter = Router();

webhooksRouter.post("/stripe", async (req: Request, res: Response) => {
  if (!stripe || !env.STRIPE_WEBHOOK_SECRET) {
    res.status(503).json({
      error: { code: "stripe_unavailable", message: "Stripe not configured" },
    });
    return;
  }
  const sig = req.headers["stripe-signature"];
  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body as Buffer,
      sig as string,
      env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (err) {
    logger.warn(`Stripe webhook signature failed: ${(err as Error).message}`);
    res.status(400).send(`Webhook Error: ${(err as Error).message}`);
    return;
  }
  try {
    await handleStripeEvent(event);
  } catch (err) {
    logger.error(`Stripe webhook handler error: ${(err as Error).message}`);
    res.status(500).json({ received: false });
    return;
  }
  res.json({ received: true });
});

webhooksRouter.post("/dubu", async (req: Request, res: Response) => {
  const raw = req.body as Buffer;
  if (env.DUBU_WEBHOOK_SECRET) {
    const sig =
      (req.headers["x-dubu-signature"] as string) ||
      (req.headers["x-signature"] as string) ||
      "";
    const expected = crypto
      .createHmac("sha256", env.DUBU_WEBHOOK_SECRET)
      .update(raw)
      .digest("hex");
    if (!sig || !safeEqual(sig, expected)) {
      logger.warn("Dubu webhook signature mismatch");
      res.status(400).json({
        error: { code: "bad_signature", message: "Invalid signature" },
      });
      return;
    }
  }
  try {
    const payload = JSON.parse(raw.toString("utf8"));
    await handleDubuEvent(payload);
  } catch (err) {
    logger.error(`Dubu webhook handler error: ${(err as Error).message}`);
    res.status(500).json({ received: false });
    return;
  }
  res.json({ received: true });
});

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
}
