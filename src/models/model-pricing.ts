import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
} from "sequelize";
import { sequelize } from "@/config/database";
import { MODEL_TIERS, type ModelTier } from "@/types";

/** Curated allowlist; pricing refreshed from OpenRouter /models. Prices are USD per token. */
export class ModelPricing extends Model<
  InferAttributes<ModelPricing>,
  InferCreationAttributes<ModelPricing>
> {
  declare id: string; // "anthropic/claude-sonnet-4.5"
  declare name: string;
  declare note: string;
  declare tier: ModelTier;
  declare inputPrice: number; // $/token
  declare outputPrice: number; // $/token
  declare contextLength: number | null;
  declare enabled: CreationOptional<boolean>;
  declare refreshedAt: Date | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

ModelPricing.init(
  {
    id: { type: DataTypes.STRING, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false },
    note: { type: DataTypes.STRING, allowNull: false, defaultValue: "" },
    tier: { type: DataTypes.ENUM(...MODEL_TIERS), allowNull: false },
    inputPrice: { type: DataTypes.DECIMAL(18, 12), allowNull: false },
    outputPrice: { type: DataTypes.DECIMAL(18, 12), allowNull: false },
    contextLength: { type: DataTypes.INTEGER, allowNull: true },
    enabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    refreshedAt: { type: DataTypes.DATE, allowNull: true },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  {
    sequelize,
    modelName: "ModelPricing",
    tableName: "model_pricing",
    indexes: [{ fields: ["enabled"] }, { fields: ["tier"] }],
  },
);
