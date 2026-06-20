import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
} from "sequelize";
import { sequelize } from "@/config/database";
import type { GenAction } from "@/types";

/** Precise per-generation accounting (one row per AI call). */
export class UsageEvent extends Model<
  InferAttributes<UsageEvent>,
  InferCreationAttributes<UsageEvent>
> {
  declare id: CreationOptional<string>;
  declare userId: string;
  declare sessionId: string | null;
  declare action: GenAction;
  declare modelId: string;
  declare inputTokens: number;
  declare outputTokens: number;
  declare rawCostUsd: number; // DECIMAL — parse with Number() at read time
  declare creditsCharged: number;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

UsageEvent.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: { type: DataTypes.UUID, allowNull: false },
    sessionId: { type: DataTypes.UUID, allowNull: true },
    action: {
      type: DataTypes.ENUM("tailor", "cover", "qa", "brief", "parse"),
      allowNull: false,
    },
    modelId: { type: DataTypes.STRING, allowNull: false },
    inputTokens: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    outputTokens: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    rawCostUsd: {
      type: DataTypes.DECIMAL(10, 6),
      allowNull: false,
      defaultValue: 0,
    },
    creditsCharged: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  {
    sequelize,
    modelName: "UsageEvent",
    tableName: "usage_events",
    indexes: [
      { fields: ["user_id", "created_at"] },
      { fields: ["session_id"] },
    ],
  },
);
