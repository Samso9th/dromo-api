import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
} from "sequelize";
import { sequelize } from "@/config/database";
import { OAUTH_PROVIDERS, type OAuthProvider } from "@/types";

export class OAuthAccount extends Model<
  InferAttributes<OAuthAccount>,
  InferCreationAttributes<OAuthAccount>
> {
  declare id: CreationOptional<string>;
  declare userId: string;
  declare provider: OAuthProvider;
  declare providerAccountId: string;
  declare accessToken: string | null;
  declare refreshToken: string | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

OAuthAccount.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    userId: { type: DataTypes.UUID, allowNull: false },
    provider: { type: DataTypes.ENUM(...OAUTH_PROVIDERS), allowNull: false },
    providerAccountId: { type: DataTypes.STRING, allowNull: false },
    accessToken: { type: DataTypes.STRING, allowNull: true },
    refreshToken: { type: DataTypes.STRING, allowNull: true },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  {
    sequelize,
    modelName: "OAuthAccount",
    tableName: "oauth_accounts",
    indexes: [{ unique: true, fields: ["provider", "provider_account_id"] }],
  },
);
