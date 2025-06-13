import { pgTable, text, serial, integer, boolean, timestamp, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const teamMembers = pgTable("team_members", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  region: text("region").notNull(), // "us" or "uk"
});

export const rotaAssignments = pgTable("rota_assignments", {
  id: serial("id").primaryKey(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  usMemberId: integer("us_member_id").references(() => teamMembers.id),
  ukMemberId: integer("uk_member_id").references(() => teamMembers.id),
  notes: text("notes"),
  isManual: boolean("is_manual").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const rotaHistory = pgTable("rota_history", {
  id: serial("id").primaryKey(),
  memberId: integer("member_id").notNull().references(() => teamMembers.id),
  assignmentId: integer("assignment_id").notNull().references(() => rotaAssignments.id),
  region: text("region").notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
});

export const holidays = pgTable("holidays", {
  id: serial("id").primaryKey(),
  memberId: integer("member_id").notNull().references(() => teamMembers.id),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertTeamMemberSchema = createInsertSchema(teamMembers).omit({
  id: true,
});

export const insertRotaAssignmentSchema = createInsertSchema(rotaAssignments).omit({
  id: true,
  createdAt: true,
});

export const insertRotaHistorySchema = createInsertSchema(rotaHistory).omit({
  id: true,
});

export const insertHolidaySchema = createInsertSchema(holidays).omit({
  id: true,
  createdAt: true,
});

export type TeamMember = typeof teamMembers.$inferSelect;
export type InsertTeamMember = z.infer<typeof insertTeamMemberSchema>;
export type RotaAssignment = typeof rotaAssignments.$inferSelect;
export type InsertRotaAssignment = z.infer<typeof insertRotaAssignmentSchema>;
export type RotaHistory = typeof rotaHistory.$inferSelect;
export type InsertRotaHistory = z.infer<typeof insertRotaHistorySchema>;
export type Holiday = typeof holidays.$inferSelect;
export type InsertHoliday = z.infer<typeof insertHolidaySchema>;
