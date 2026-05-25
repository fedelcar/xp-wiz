import {
  pgTable,
  text,
  serial,
  boolean,
  integer,
  date,
  timestamp,
  numeric,
  primaryKey,
} from "drizzle-orm/pg-core";
import type { AdapterAccountType } from "next-auth/adapters";

// ── Auth.js required tables ────────────────────────────────────────────────

export const users = pgTable("users", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("email_verified", { mode: "date" }),
  image: text("image"),
});

export const accounts = pgTable(
  "accounts",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => [primaryKey({ columns: [account.provider, account.providerAccountId] })]
);

export const sessions = pgTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (vt) => [primaryKey({ columns: [vt.identifier, vt.token] })]
);

// ── App tables ─────────────────────────────────────────────────────────────

export type EntryStatus = "completed" | "scheduled" | "planned";
export type EntryType = "flight" | "card" | "bonus";
export type CabinClass = "economy" | "comfort" | "business" | "first";

export const xpEntries = pgTable("xp_entries", {
  id: serial("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  date: date("date").notNull(),
  // For flights: airport code (e.g. "DUB"). For cards/bonuses: source name.
  destination: text("destination").notNull(),
  isReturn: boolean("is_return").default(false),
  status: text("status").$type<EntryStatus>().notNull().default("planned"),
  entryType: text("entry_type").$type<EntryType>().notNull().default("flight"),
  cabinClass: text("cabin_class").$type<CabinClass>(),
  xp: integer("xp").notNull(),
  // SAF (Sustainable Aviation Fuel) - only relevant for flights
  hasSaf: boolean("has_saf").default(false),
  safXp: integer("saf_xp").default(0),
  safCostEur: numeric("saf_cost_eur", { precision: 10, scale: 2 }),
  // Card / bonus entries
  entryName: text("entry_name"), // display name for non-flight entries
  isRecurring: boolean("is_recurring").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const userSettings = pgTable("user_settings", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  // Membership year cutoff: month (1-12) and day (1-31)
  cutoffMonth: integer("cutoff_month").default(1),
  cutoffDay: integer("cutoff_day").default(1),
  activeYear: integer("active_year"),
});

export type XpEntry = typeof xpEntries.$inferSelect;
export type NewXpEntry = typeof xpEntries.$inferInsert;
export type UserSettings = typeof userSettings.$inferSelect;
