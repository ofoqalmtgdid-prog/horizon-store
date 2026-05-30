import { pgTable, serial, text, integer, timestamp, varchar, numeric } from "drizzle-orm/pg-core";

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  fullName: text("full_name").notNull(),
  phone: varchar("phone", { length: 64 }).unique(),
  region: text("region").notNull().default("طرابلس"),
  age: integer("age").notNull().default(18),
  gender: varchar("gender", { length: 16 }).notNull().default("male"),
  passwordHash: text("password_hash"),
  role: varchar("role", { length: 16 }).notNull().default("customer"),
  avatarUrl: text("avatar_url"),
  walletBalance: numeric("wallet_balance", { precision: 12, scale: 2 }).notNull().default("0"),
  googleId: text("google_id").unique(),
  email: text("email"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type DbUser = typeof usersTable.$inferSelect;
export type DbInsertUser = typeof usersTable.$inferInsert;
