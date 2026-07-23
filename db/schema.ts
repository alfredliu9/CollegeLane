import { integer, primaryKey, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const schools = sqliteTable("schools", {
  id:text("id").primaryKey(), name:text("name").notNull(), city:text("city").notNull(), region:text("region").notNull(), country:text("country").notNull(), pathway:text("pathway").notNull(), division:text("division").notNull(), conference:text("conference").notNull(), size:text("size").notNull(), majorsJson:text("majors_json").notNull(), teamCategory:text("team_category").notNull(), sourceUrl:text("source_url").notNull(), sourceLabel:text("source_label").notNull(), reviewedAt:text("reviewed_at").notNull()
});
export const programMetrics = sqliteTable("program_metrics", {
  schoolId:text("school_id").notNull(), event:text("event").notNull(), gender:text("gender").notNull(), rosterAverage:real("roster_average").notNull()
}, table=>[primaryKey({columns:[table.schoolId,table.event,table.gender]})]);

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

export const authIdentities = sqliteTable("auth_identities", {
  provider:text("provider").notNull(),
  providerSubject:text("provider_subject").notNull(),
  userId:text("user_id").notNull(),
  email:text("email").notNull(),
  createdAt:integer("created_at").notNull()
}, table=>[primaryKey({columns:[table.provider,table.providerSubject]})]);

export const userState = sqliteTable("user_state", {
  userId:text("user_id").notNull(),
  stateKey:text("state_key").notNull(),
  valueJson:text("value_json").notNull(),
  updatedAt:integer("updated_at").notNull()
}, table=>[primaryKey({columns:[table.userId,table.stateKey]})]);

export const coaches = sqliteTable("coaches", {
  id:text("id").primaryKey(), schoolId:text("school_id").notNull(), name:text("name").notNull(), role:text("role").notNull(), email:text("email").notNull().default(""), sourceUrl:text("source_url").notNull(), verifiedAt:integer("verified_at").notNull()
});

export const userUploads = sqliteTable("user_uploads", {
  id:text("id").primaryKey(), userId:text("user_id").notNull(), kind:text("kind").notNull(), filename:text("filename").notNull(), contentType:text("content_type").notNull(), size:integer("size").notNull(), objectKey:text("object_key").notNull(), createdAt:integer("created_at").notNull()
});
