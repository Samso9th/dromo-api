import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "@/middleware/require-auth";
import { validate } from "@/middleware/validate";
import { asyncHandler } from "@/utils/app-error";
import { reqUser } from "@/utils/req-user";
import { getBalance } from "@/services/credits.service";
import { createCheckout } from "@/services/payments.service";
import { CreditTransaction } from "@/models";

export const billingRouter = Router();

const checkoutSchema = z.object({
  kind: z.enum(["subscription", "topup"]),
  method: z.enum(["stripe", "dubu"]),
  planId: z.enum(["free", "pro", "premium"]).optional(),
  credits: z.number().int().positive().optional(),
});

// GET /billing/balance
billingRouter.get(
  "/balance",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { balance, plan } = await getBalance(reqUser(req).id);
    res.json({ balance, plan });
  }),
);

// GET /billing/transactions
billingRouter.get(
  "/transactions",
  requireAuth,
  asyncHandler(async (req, res) => {
    const rows = await CreditTransaction.findAll({
      where: { userId: reqUser(req).id },
      order: [["createdAt", "DESC"]],
      limit: 100,
    });
    res.json(
      rows.map((t) => ({
        id: t.id,
        kind: t.kind,
        amount: t.amount,
        description: t.description,
        createdAt: t.createdAt,
      })),
    );
  }),
);

// POST /billing/checkout → { url } (Stripe card or Dubu Pay)
billingRouter.post(
  "/checkout",
  requireAuth,
  validate({ body: checkoutSchema }),
  asyncHandler(async (req, res) => {
    const result = await createCheckout(reqUser(req), req.body);
    res.json(result);
  }),
);
