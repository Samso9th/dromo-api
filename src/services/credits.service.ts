import type { Transaction } from "sequelize";
import { CreditTransaction, User } from "@/models";
import { notFound } from "@/utils/app-error";
import type { CreditTxnKind, CreditTxnRef, Plan } from "@/types";

export const SIGNUP_CREDITS = 100;

interface GrantOpts {
  kind: CreditTxnKind;
  description: string;
  refType?: CreditTxnRef;
  refId?: string;
}

/**
 * Apply a signed credit delta to a user inside a transaction, append a ledger row,
 * and update the cached balance. Positive = grant/topup/refund, negative = spend.
 * Locks the user row to keep the cached balance consistent under concurrency.
 */
export async function applyCredits(
  userId: string,
  amount: number,
  opts: GrantOpts,
  t: Transaction,
): Promise<number> {
  const user = await User.findByPk(userId, {
    transaction: t,
    lock: t.LOCK.UPDATE,
  });
  if (!user) throw notFound("User not found");

  const balanceAfter = Math.max(0, user.credits + amount);
  user.credits = balanceAfter;
  await user.save({ transaction: t });

  await CreditTransaction.create(
    {
      userId,
      kind: opts.kind,
      amount,
      balanceAfter,
      description: opts.description,
      refType: opts.refType ?? null,
      refId: opts.refId ?? null,
    },
    { transaction: t },
  );

  return balanceAfter;
}

export async function getBalance(
  userId: string,
): Promise<{ balance: number; plan: Plan }> {
  const user = await User.findByPk(userId);
  if (!user) throw notFound("User not found");
  return { balance: user.credits, plan: user.plan };
}
