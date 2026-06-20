import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
} from "sequelize";
import { sequelize } from "@/config/database";
import type {
  ChatRole,
  DocFormat,
  InterviewTone,
  InterviewType,
  TailoredResumeData,
} from "@/types";

/* ── Tailored resume (1:1 session) ── */
export class TailoredResume extends Model<
  InferAttributes<TailoredResume>,
  InferCreationAttributes<TailoredResume>
> {
  declare id: CreationOptional<string>;
  declare sessionId: string;
  declare data: TailoredResumeData;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}
TailoredResume.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    sessionId: { type: DataTypes.UUID, allowNull: false, unique: true },
    data: { type: DataTypes.JSONB, allowNull: false },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  { sequelize, modelName: "TailoredResume", tableName: "tailored_resumes" },
);

/* ── Cover letter (1:1 session) ── */
export class CoverLetter extends Model<
  InferAttributes<CoverLetter>,
  InferCreationAttributes<CoverLetter>
> {
  declare id: CreationOptional<string>;
  declare sessionId: string;
  declare greeting: string;
  declare body: string;
  declare closing: string;
  declare signature: string;
  declare tone: string | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}
CoverLetter.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    sessionId: { type: DataTypes.UUID, allowNull: false, unique: true },
    greeting: { type: DataTypes.TEXT, allowNull: false },
    body: { type: DataTypes.TEXT, allowNull: false },
    closing: { type: DataTypes.TEXT, allowNull: false },
    signature: { type: DataTypes.STRING, allowNull: false },
    tone: { type: DataTypes.STRING, allowNull: true },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  { sequelize, modelName: "CoverLetter", tableName: "cover_letters" },
);

/* ── Chat messages (1:N session) ── */
export class ChatMessage extends Model<
  InferAttributes<ChatMessage>,
  InferCreationAttributes<ChatMessage>
> {
  declare id: CreationOptional<string>;
  declare sessionId: string;
  declare role: ChatRole;
  declare content: string;
  declare modelId: string | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}
ChatMessage.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    sessionId: { type: DataTypes.UUID, allowNull: false },
    role: { type: DataTypes.ENUM("user", "assistant"), allowNull: false },
    content: { type: DataTypes.TEXT, allowNull: false },
    modelId: { type: DataTypes.STRING, allowNull: true },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  {
    sequelize,
    modelName: "ChatMessage",
    tableName: "chat_messages",
    indexes: [{ fields: ["session_id", "created_at"] }],
  },
);

/* ── Interview brief (1:1 session) ── */
export class InterviewBrief extends Model<
  InferAttributes<InterviewBrief>,
  InferCreationAttributes<InterviewBrief>
> {
  declare id: CreationOptional<string>;
  declare sessionId: string;
  declare content: string;
  declare type: InterviewType;
  declare tone: InterviewTone;
  declare format: DocFormat;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}
InterviewBrief.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    sessionId: { type: DataTypes.UUID, allowNull: false, unique: true },
    content: { type: DataTypes.TEXT, allowNull: false },
    type: {
      type: DataTypes.ENUM(
        "recruiter-screen",
        "behavioral",
        "technical",
        "system-design",
        "mixed",
      ),
      allowNull: false,
    },
    tone: {
      type: DataTypes.ENUM("professional", "conversational", "creative"),
      allowNull: false,
    },
    format: {
      type: DataTypes.ENUM("md", "docx", "pdf", "txt"),
      allowNull: false,
    },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  { sequelize, modelName: "InterviewBrief", tableName: "interview_briefs" },
);
