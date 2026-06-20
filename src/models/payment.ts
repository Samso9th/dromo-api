import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
} from "sequelize";
import { sequelize } from "@/config/database";
import type { PaymentKind, PaymentProvider, PaymentStatus } from "@/types";

export class Payment extends Model<
  InferAttributes<Payment>,
  InferCreationAttributes<Payment>
> {
  declare id: CreationOptional<string>;
  declare userId: string;
  declare provider: PaymentProvider;
  declare providerRef: string; // payment_intent / checkout / invoice id
  declare kind: PaymentKind;
  declare amountUsd: number; // DECIMAL — parse with Number() at read time
  declare creditsGranted: number;
  declare status: PaymentStatus;
  declare metadata: Record<string, unknown> | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

Payment.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: { type: DataTypes.UUID, allowNull: false },
    provider: { type: DataTypes.ENUM("stripe", "dubu"), allowNull: false },
    providerRef: { type: DataTypes.STRING, allowNull: false },
    kind: { type: DataTypes.ENUM("subscription", "topup"), allowNull: false },
    amountUsd: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    creditsGranted: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    status: {
      type: DataTypes.ENUM("pending", "succeeded", "failed", "refunded"),
      allowNull: false,
      defaultValue: "pending",
    },
    metadata: { type: DataTypes.JSONB, allowNull: true },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  {
    sequelize,
    modelName: "Payment",
    tableName: "payments",
    indexes: [
      { unique: true, fields: ["provider", "provider_ref"] },
      { fields: ["user_id"] },
    ],
  },
);
