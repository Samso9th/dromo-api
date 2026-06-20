import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
} from "sequelize";
import { sequelize } from "@/config/database";
import type { SessionRetries, SessionStatus } from "@/types";

export class GenerationSession extends Model<
  InferAttributes<GenerationSession>,
  InferCreationAttributes<GenerationSession>
> {
  declare id: CreationOptional<string>;
  declare userId: string;
  declare company: string;
  declare role: string;
  declare jobUrl: string | null;
  declare jobDescription: string;
  declare modelId: string;
  declare templateId: string;
  declare status: CreationOptional<SessionStatus>;
  declare retries: CreationOptional<SessionRetries>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

GenerationSession.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: { type: DataTypes.UUID, allowNull: false },
    company: { type: DataTypes.STRING, allowNull: false },
    role: { type: DataTypes.STRING, allowNull: false },
    jobUrl: { type: DataTypes.STRING, allowNull: true },
    jobDescription: { type: DataTypes.TEXT, allowNull: false },
    modelId: { type: DataTypes.STRING, allowNull: false },
    templateId: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "classic",
    },
    status: {
      type: DataTypes.ENUM("active", "archived"),
      allowNull: false,
      defaultValue: "active",
    },
    retries: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: { tailor: 0, cover: 0, brief: 0 },
    },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  {
    sequelize,
    modelName: "GenerationSession",
    tableName: "generation_sessions",
    indexes: [
      { fields: ["user_id", "status"] },
      { fields: ["user_id", "created_at"] },
    ],
  },
);
