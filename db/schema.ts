import { integer, primaryKey, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const schools = sqliteTable("schools", {
  id:text("id").primaryKey(), name:text("name").notNull(), city:text("city").notNull(), region:text("region").notNull(), country:text("country").notNull(), pathway:text("pathway").notNull(), division:text("division").notNull(), conference:text("conference").notNull(), size:text("size").notNull(), majorsJson:text("majors_json").notNull(), teamCategory:text("team_category").notNull(), sourceUrl:text("source_url").notNull(), sourceLabel:text("source_label").notNull(), reviewedAt:text("reviewed_at").notNull()
});
export const programMetrics = sqliteTable("program_metrics", {
  schoolId:text("school_id").notNull(), event:text("event").notNull(), rosterAverage:real("roster_average").notNull()
}, table=>[primaryKey({columns:[table.schoolId,table.event]})]);

export const users = sqliteTable("users", {
  id:text("id").primaryKey(),
  email:text("email").notNull().unique(),
  lastName:text("last_name").notNull().default(""),
  passwordHash:text("password_hash").notNull(),
  passwordSalt:text("password_salt").notNull(),
  createdAt:integer("created_at").notNull()
});

export const sessions = sqliteTable("sessions", {
  tokenHash:text("token_hash").primaryKey(),
  userId:text("user_id").notNull(),
  expiresAt:integer("expires_at").notNull(),
  createdAt:integer("created_at").notNull()
});

export const userState = sqliteTable("user_state", {
  userId:text("user_id").notNull(),
  stateKey:text("state_key").notNull(),
  valueJson:text("value_json").notNull(),
  updatedAt:integer("updated_at").notNull()
}, table=>[primaryKey({columns:[table.userId,table.stateKey]})]);
