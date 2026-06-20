import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
} from "sequelize";
import { sequelize } from "@/config/database";
import { PLANS, type Plan } from "@/types";

export class User extends Model<
  InferAttributes<User>,
  InferCreationAttributes<User>
> {
  declare id: CreationOptional<string>;
  declare name: string;
  declare email: string;
  declare passwordHash: string | null;
  declare emailVerified: CreationOptional<boolean>;
  declare plan: CreationOptional<Plan>;
  declare credits: CreationOptional<number>;
  declare avatarUrl: string | null;
  declare stripeCustomerId: string | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

User.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, allowNull: false, unique: true },
    passwordHash: { type: DataTypes.STRING, allowNull: true },
    emailVerified: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    plan: {
      type: DataTypes.ENUM(...PLANS),
      allowNull: false,
      defaultValue: "free",
    },
    credits: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    avatarUrl: { type: DataTypes.STRING, allowNull: true },
    stripeCustomerId: { type: DataTypes.STRING, allowNull: true },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  { sequelize, modelName: "User", tableName: "users" },
);
