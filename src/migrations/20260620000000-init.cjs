"use strict";

/** Initial schema for Dromo. See docs/api-spec.md §2. */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { UUID, UUIDV4, STRING, TEXT, INTEGER, BOOLEAN, DATE, JSONB, DECIMAL, ENUM } = Sequelize;
    const ts = () => ({
      created_at: { type: DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
      updated_at: { type: DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
    });
    const fk = (table) => ({ type: UUID, references: { model: table, key: "id" }, onDelete: "CASCADE" });

    await queryInterface.createTable("users", {
      id: { type: UUID, defaultValue: UUIDV4, primaryKey: true },
      name: { type: STRING, allowNull: false },
      email: { type: STRING, allowNull: false, unique: true },
      password_hash: { type: STRING, allowNull: true },
      email_verified: { type: BOOLEAN, allowNull: false, defaultValue: false },
      plan: { type: ENUM("free", "pro", "premium"), allowNull: false, defaultValue: "free" },
      credits: { type: INTEGER, allowNull: false, defaultValue: 0 },
      avatar_url: { type: STRING, allowNull: true },
      stripe_customer_id: { type: STRING, allowNull: true },
      ...ts(),
    });

    await queryInterface.createTable("oauth_accounts", {
      id: { type: UUID, defaultValue: UUIDV4, primaryKey: true },
      user_id: { ...fk("users"), allowNull: false },
      provider: { type: ENUM("google", "github", "linkedin"), allowNull: false },
      provider_account_id: { type: STRING, allowNull: false },
      access_token: { type: STRING, allowNull: true },
      refresh_token: { type: STRING, allowNull: true },
      ...ts(),
    });
    await queryInterface.addIndex("oauth_accounts", ["provider", "provider_account_id"], { unique: true });

    await queryInterface.createTable("refresh_tokens", {
      id: { type: UUID, defaultValue: UUIDV4, primaryKey: true },
      user_id: { ...fk("users"), allowNull: false },
      token_hash: { type: STRING, allowNull: false },
      expires_at: { type: DATE, allowNull: false },
      revoked_at: { type: DATE, allowNull: true },
      user_agent: { type: STRING, allowNull: true },
      ip: { type: STRING, allowNull: true },
      ...ts(),
    });
    await queryInterface.addIndex("refresh_tokens", ["user_id"]);
    await queryInterface.addIndex("refresh_tokens", ["token_hash"]);

    await queryInterface.createTable("master_resumes", {
      id: { type: UUID, defaultValue: UUIDV4, primaryKey: true },
      user_id: { ...fk("users"), allowNull: false, unique: true },
      data: { type: JSONB, allowNull: false },
      source_file_url: { type: STRING, allowNull: true },
      parsed_at: { type: DATE, allowNull: true },
      ...ts(),
    });

    await queryInterface.createTable("generation_sessions", {
      id: { type: UUID, defaultValue: UUIDV4, primaryKey: true },
      user_id: { ...fk("users"), allowNull: false },
      company: { type: STRING, allowNull: false },
      role: { type: STRING, allowNull: false },
      job_url: { type: STRING, allowNull: true },
      job_description: { type: TEXT, allowNull: false },
      model_id: { type: STRING, allowNull: false },
      template_id: { type: STRING, allowNull: false, defaultValue: "classic" },
      status: { type: ENUM("active", "archived"), allowNull: false, defaultValue: "active" },
      retries: { type: JSONB, allowNull: false, defaultValue: { tailor: 0, cover: 0, brief: 0 } },
      ...ts(),
    });
    await queryInterface.addIndex("generation_sessions", ["user_id", "status"]);
    await queryInterface.addIndex("generation_sessions", ["user_id", "created_at"]);

    await queryInterface.createTable("tailored_resumes", {
      id: { type: UUID, defaultValue: UUIDV4, primaryKey: true },
      session_id: { ...fk("generation_sessions"), allowNull: false, unique: true },
      data: { type: JSONB, allowNull: false },
      ...ts(),
    });

    await queryInterface.createTable("cover_letters", {
      id: { type: UUID, defaultValue: UUIDV4, primaryKey: true },
      session_id: { ...fk("generation_sessions"), allowNull: false, unique: true },
      greeting: { type: TEXT, allowNull: false },
      body: { type: TEXT, allowNull: false },
      closing: { type: TEXT, allowNull: false },
      signature: { type: STRING, allowNull: false },
      tone: { type: STRING, allowNull: true },
      ...ts(),
    });

    await queryInterface.createTable("chat_messages", {
      id: { type: UUID, defaultValue: UUIDV4, primaryKey: true },
      session_id: { ...fk("generation_sessions"), allowNull: false },
      role: { type: ENUM("user", "assistant"), allowNull: false },
      content: { type: TEXT, allowNull: false },
      model_id: { type: STRING, allowNull: true },
      ...ts(),
    });
    await queryInterface.addIndex("chat_messages", ["session_id", "created_at"]);

    await queryInterface.createTable("interview_briefs", {
      id: { type: UUID, defaultValue: UUIDV4, primaryKey: true },
      session_id: { ...fk("generation_sessions"), allowNull: false, unique: true },
      content: { type: TEXT, allowNull: false },
      type: {
        type: ENUM("recruiter-screen", "behavioral", "technical", "system-design", "mixed"),
        allowNull: false,
      },
      tone: { type: ENUM("professional", "conversational", "creative"), allowNull: false },
      format: { type: ENUM("md", "docx", "pdf", "txt"), allowNull: false },
      ...ts(),
    });

    await queryInterface.createTable("model_pricing", {
      id: { type: STRING, primaryKey: true },
      name: { type: STRING, allowNull: false },
      note: { type: STRING, allowNull: false, defaultValue: "" },
      tier: { type: ENUM("economy", "standard", "premium"), allowNull: false },
      input_price: { type: DECIMAL(18, 12), allowNull: false },
      output_price: { type: DECIMAL(18, 12), allowNull: false },
      context_length: { type: INTEGER, allowNull: true },
      enabled: { type: BOOLEAN, allowNull: false, defaultValue: true },
      refreshed_at: { type: DATE, allowNull: true },
      ...ts(),
    });
    await queryInterface.addIndex("model_pricing", ["enabled"]);
    await queryInterface.addIndex("model_pricing", ["tier"]);

    await queryInterface.createTable("usage_events", {
      id: { type: UUID, defaultValue: UUIDV4, primaryKey: true },
      user_id: { ...fk("users"), allowNull: false },
      session_id: { type: UUID, allowNull: true, references: { model: "generation_sessions", key: "id" }, onDelete: "SET NULL" },
      action: { type: ENUM("tailor", "cover", "qa", "brief", "parse"), allowNull: false },
      model_id: { type: STRING, allowNull: false },
      input_tokens: { type: INTEGER, allowNull: false, defaultValue: 0 },
      output_tokens: { type: INTEGER, allowNull: false, defaultValue: 0 },
      raw_cost_usd: { type: DECIMAL(10, 6), allowNull: false, defaultValue: 0 },
      credits_charged: { type: INTEGER, allowNull: false, defaultValue: 0 },
      ...ts(),
    });
    await queryInterface.addIndex("usage_events", ["user_id", "created_at"]);
    await queryInterface.addIndex("usage_events", ["session_id"]);

    await queryInterface.createTable("credit_transactions", {
      id: { type: UUID, defaultValue: UUIDV4, primaryKey: true },
      user_id: { ...fk("users"), allowNull: false },
      kind: { type: ENUM("grant", "spend", "topup", "refund", "adjustment"), allowNull: false },
      amount: { type: INTEGER, allowNull: false },
      balance_after: { type: INTEGER, allowNull: false },
      description: { type: STRING, allowNull: false },
      ref_type: { type: ENUM("usage", "payment", "subscription", "signup", "manual"), allowNull: true },
      ref_id: { type: UUID, allowNull: true },
      ...ts(),
    });
    await queryInterface.addIndex("credit_transactions", ["user_id", "created_at"]);

    await queryInterface.createTable("subscriptions", {
      id: { type: UUID, defaultValue: UUIDV4, primaryKey: true },
      user_id: { ...fk("users"), allowNull: false },
      plan: { type: ENUM("pro", "premium"), allowNull: false },
      status: { type: ENUM("active", "past_due", "canceled", "incomplete"), allowNull: false },
      provider: { type: ENUM("stripe", "dubu"), allowNull: false },
      provider_subscription_id: { type: STRING, allowNull: false },
      current_period_start: { type: DATE, allowNull: true },
      current_period_end: { type: DATE, allowNull: true },
      cancel_at_period_end: { type: BOOLEAN, allowNull: false, defaultValue: false },
      ...ts(),
    });
    await queryInterface.addIndex("subscriptions", ["user_id"]);
    await queryInterface.addIndex("subscriptions", ["provider", "provider_subscription_id"], { unique: true });

    await queryInterface.createTable("payments", {
      id: { type: UUID, defaultValue: UUIDV4, primaryKey: true },
      user_id: { ...fk("users"), allowNull: false },
      provider: { type: ENUM("stripe", "dubu"), allowNull: false },
      provider_ref: { type: STRING, allowNull: false },
      kind: { type: ENUM("subscription", "topup"), allowNull: false },
      amount_usd: { type: DECIMAL(10, 2), allowNull: false },
      credits_granted: { type: INTEGER, allowNull: false, defaultValue: 0 },
      status: { type: ENUM("pending", "succeeded", "failed", "refunded"), allowNull: false, defaultValue: "pending" },
      metadata: { type: JSONB, allowNull: true },
      ...ts(),
    });
    await queryInterface.addIndex("payments", ["provider", "provider_ref"], { unique: true });
    await queryInterface.addIndex("payments", ["user_id"]);
  },

  async down(queryInterface) {
    const tables = [
      "payments",
      "subscriptions",
      "credit_transactions",
      "usage_events",
      "model_pricing",
      "interview_briefs",
      "chat_messages",
      "cover_letters",
      "tailored_resumes",
      "generation_sessions",
      "master_resumes",
      "refresh_tokens",
      "oauth_accounts",
      "users",
    ];
    for (const t of tables) await queryInterface.dropTable(t);
  },
};
