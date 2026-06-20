import { Router } from "express";
import { requireAuth } from "@/middleware/require-auth";
import { asyncHandler } from "@/utils/app-error";
import { reqUser } from "@/utils/req-user";
import { getBalance } from "@/services/credits.service";
import { CreditTransaction } from "@/models";

export const billingRouter = Router();

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

// POST /billing/checkout (Stripe / Dubu) is added with the payments module.
