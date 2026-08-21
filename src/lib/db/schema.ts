import { index, integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { PATCH_STATUSES } from "../domain";

export const users = sqliteTable(
  "users",
  {
    id: text("id").primaryKey(),
    username: text("username").notNull(),
    createdAt: integer("created_at", { mode: "number" }).notNull(),
    updatedAt: integer("updated_at", { mode: "number" }).notNull(),
  },
  (table) => [index("users_username_idx").on(table.username)],
);

export const patches = sqliteTable(
  "patches",
  {
    minecraftVersion: text("minecraft_version").notNull(),
    path: text("path").notNull(),
    status: text("status", { enum: PATCH_STATUSES }).notNull(),
    responsibleUserId: text("responsible_user_id").references(() => users.id),
    updatedAt: integer("updated_at", { mode: "number" }).notNull(),
    duration: integer("duration", { mode: "number" }),
  },
  (table) => [
    primaryKey({ columns: [table.minecraftVersion, table.path] }),
    index("patches_responsible_user_id_idx").on(table.responsibleUserId),
  ],
);

export const identities = sqliteTable(
  "identities",
  {
    issuer: text("issuer").notNull(),
    subject: text("subject").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
  },
  (table) => [primaryKey({ columns: [table.issuer, table.subject] }), index("identities_user_id_idx").on(table.userId)],
);

export const legacyCredentials = sqliteTable(
  "legacy_credentials",
  {
    username: text("username").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    passwordHash: text("password_hash"),
    disabledAt: integer("disabled_at", { mode: "number" }),
  },
  (table) => [index("legacy_credentials_user_id_idx").on(table.userId)],
);
