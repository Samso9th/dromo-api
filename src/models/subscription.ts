import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
} from "sequelize";
import { sequelize } from "@/config/database";
import type { PaymentProvider, SubStatus } from "@/types";

export class Subscription extends Model<
  InferAttributes<Subscription>,
  InferCreationAttributes<Subscription>
> {
  declare id: CreationOptional<string>;
  declare userId: string;
  declare plan: "pro" | "premium";
  declare status: SubStatus;
  declare provider: PaymentProvider;
  declare providerSubscriptionId: string;
  declare currentPeriodStart: Date | null;
  declare currentPeriodEnd: Date | null;
  declare cancelAtPeriodEnd: CreationOptional<boolean>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

Subscription.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: { type: DataTypes.UUID, allowNull: false },
    plan: { type: DataTypes.ENUM("pro", "premium"), allowNull: false },
    status: {
      type: DataTypes.ENUM("active", "past_due", "canceled", "incomplete"),
      allowNull: false,
    },
    provider: { type: DataTypes.ENUM("stripe", "dubu"), allowNull: false },
    providerSubscriptionId: { type: DataTypes.STRING, allowNull: false },
    currentPeriodStart: { type: DataTypes.DATE, allowNull: true },
    currentPeriodEnd: { type: DataTypes.DATE, allowNull: true },
    cancelAtPeriodEnd: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  {
    sequelize,
    modelName: "Subscription",
    tableName: "subscriptions",
    indexes: [
      { fields: ["user_id"] },
      { unique: true, fields: ["provider", "provider_subscription_id"] },
    ],
  },
);
