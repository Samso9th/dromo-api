import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
} from "sequelize";
import { sequelize } from "@/config/database";
import type { CreditTxnKind, CreditTxnRef } from "@/types";

/** Append-only ledger. users.credits is a cached sum of these. */
export class CreditTransaction extends Model<
  InferAttributes<CreditTransaction>,
  InferCreationAttributes<CreditTransaction>
> {
  declare id: CreationOptional<string>;
  declare userId: string;
  declare kind: CreditTxnKind;
  declare amount: number; // signed
  declare balanceAfter: number;
  declare description: string;
  declare refType: CreditTxnRef | null;
  declare refId: string | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

CreditTransaction.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    userId: { type: DataTypes.UUID, allowNull: false },
    kind: {
      type: DataTypes.ENUM("grant", "spend", "topup", "refund", "adjustment"),
      allowNull: false,
    },
    amount: { type: DataTypes.INTEGER, allowNull: false },
    balanceAfter: { type: DataTypes.INTEGER, allowNull: false },
    description: { type: DataTypes.STRING, allowNull: false },
    refType: {
      type: DataTypes.ENUM("usage", "payment", "subscription", "signup", "manual"),
      allowNull: true,
    },
    refId: { type: DataTypes.UUID, allowNull: true },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  {
    sequelize,
    modelName: "CreditTransaction",
    tableName: "credit_transactions",
    indexes: [{ fields: ["user_id", "created_at"] }],
  },
);
