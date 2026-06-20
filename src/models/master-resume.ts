import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
} from "sequelize";
import { sequelize } from "@/config/database";
import type { MasterResumeData } from "@/types";

export class MasterResume extends Model<
  InferAttributes<MasterResume>,
  InferCreationAttributes<MasterResume>
> {
  declare id: CreationOptional<string>;
  declare userId: string;
  declare data: MasterResumeData;
  declare sourceFileUrl: string | null;
  declare parsedAt: Date | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

MasterResume.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: { type: DataTypes.UUID, allowNull: false, unique: true },
    data: { type: DataTypes.JSONB, allowNull: false },
    sourceFileUrl: { type: DataTypes.STRING, allowNull: true },
    parsedAt: { type: DataTypes.DATE, allowNull: true },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  { sequelize, modelName: "MasterResume", tableName: "master_resumes" },
);
