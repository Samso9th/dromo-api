import { sequelize } from "@/config/database";
import { User } from "./user";
import { OAuthAccount } from "./oauth-account";
import { RefreshToken } from "./refresh-token";
import { MasterResume } from "./master-resume";
import { GenerationSession } from "./generation-session";
import {
  TailoredResume,
  CoverLetter,
  ChatMessage,
  InterviewBrief,
} from "./artifacts";
import { ModelPricing } from "./model-pricing";
import { UsageEvent } from "./usage-event";
import { CreditTransaction } from "./credit-transaction";
import { Subscription } from "./subscription";
import { Payment } from "./payment";

/* ── Associations ───────────────────────────────────────── */

// User 1:N
User.hasMany(OAuthAccount, { foreignKey: "userId", onDelete: "CASCADE" });
OAuthAccount.belongsTo(User, { foreignKey: "userId" });

User.hasMany(RefreshToken, { foreignKey: "userId", onDelete: "CASCADE" });
RefreshToken.belongsTo(User, { foreignKey: "userId" });

User.hasOne(MasterResume, { foreignKey: "userId", onDelete: "CASCADE" });
MasterResume.belongsTo(User, { foreignKey: "userId" });

User.hasMany(GenerationSession, { foreignKey: "userId", onDelete: "CASCADE" });
GenerationSession.belongsTo(User, { foreignKey: "userId" });

User.hasMany(CreditTransaction, { foreignKey: "userId", onDelete: "CASCADE" });
CreditTransaction.belongsTo(User, { foreignKey: "userId" });

User.hasMany(UsageEvent, { foreignKey: "userId", onDelete: "CASCADE" });
UsageEvent.belongsTo(User, { foreignKey: "userId" });

User.hasMany(Subscription, { foreignKey: "userId", onDelete: "CASCADE" });
Subscription.belongsTo(User, { foreignKey: "userId" });

User.hasMany(Payment, { foreignKey: "userId", onDelete: "CASCADE" });
Payment.belongsTo(User, { foreignKey: "userId" });

// Session 1:1 / 1:N artifacts
GenerationSession.hasOne(TailoredResume, {
  foreignKey: "sessionId",
  onDelete: "CASCADE",
  as: "tailoredResume",
});
TailoredResume.belongsTo(GenerationSession, { foreignKey: "sessionId" });

GenerationSession.hasOne(CoverLetter, {
  foreignKey: "sessionId",
  onDelete: "CASCADE",
  as: "coverLetter",
});
CoverLetter.belongsTo(GenerationSession, { foreignKey: "sessionId" });

GenerationSession.hasMany(ChatMessage, {
  foreignKey: "sessionId",
  onDelete: "CASCADE",
  as: "chat",
});
ChatMessage.belongsTo(GenerationSession, { foreignKey: "sessionId" });

GenerationSession.hasOne(InterviewBrief, {
  foreignKey: "sessionId",
  onDelete: "CASCADE",
  as: "interviewBrief",
});
InterviewBrief.belongsTo(GenerationSession, { foreignKey: "sessionId" });

GenerationSession.hasMany(UsageEvent, { foreignKey: "sessionId" });
UsageEvent.belongsTo(GenerationSession, { foreignKey: "sessionId" });

export {
  sequelize,
  User,
  OAuthAccount,
  RefreshToken,
  MasterResume,
  GenerationSession,
  TailoredResume,
  CoverLetter,
  ChatMessage,
  InterviewBrief,
  ModelPricing,
  UsageEvent,
  CreditTransaction,
  Subscription,
  Payment,
};
