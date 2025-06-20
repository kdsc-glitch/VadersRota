import { teamMembers, rotaAssignments, rotaHistory, holidays, type TeamMember, type InsertTeamMember, type RotaAssignment, type InsertRotaAssignment, type RotaHistory, type InsertRotaHistory, type Holiday, type InsertHoliday } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

export interface IStorage {
  // Team Members
  getTeamMembers(): Promise<TeamMember[]>;
  getTeamMemberById(id: number): Promise<TeamMember | undefined>;
  getTeamMembersByRegion(region: string): Promise<TeamMember[]>;
  createTeamMember(member: InsertTeamMember): Promise<TeamMember>;
  updateTeamMember(id: number, updates: Partial<InsertTeamMember>): Promise<TeamMember | undefined>;
  deleteTeamMember(id: number): Promise<boolean>;

  // Rota Assignments
  getRotaAssignments(): Promise<RotaAssignment[]>;
  getRotaAssignmentById(id: number): Promise<RotaAssignment | undefined>;
  getCurrentAssignment(): Promise<RotaAssignment | undefined>;
  getUpcomingAssignments(): Promise<RotaAssignment[]>;
  createRotaAssignment(assignment: InsertRotaAssignment): Promise<RotaAssignment>;
  updateRotaAssignment(id: number, updates: Partial<InsertRotaAssignment>): Promise<RotaAssignment | undefined>;
  deleteRotaAssignment(id: number): Promise<boolean>;

  // Rota History
  getRotaHistory(): Promise<RotaHistory[]>;
  getRotaHistoryByMember(memberId: number): Promise<RotaHistory[]>;
  createRotaHistory(history: InsertRotaHistory): Promise<RotaHistory>;

  // Holidays
  getHolidays(): Promise<Holiday[]>;
  getHolidaysByMember(memberId: number): Promise<Holiday[]>;
  createHoliday(holiday: InsertHoliday): Promise<Holiday>;
  updateHoliday(id: number, updates: Partial<InsertHoliday>): Promise<Holiday | undefined>;
  deleteHoliday(id: number): Promise<boolean>;

  // Utility methods
  getMemberAssignmentCount(memberId: number): Promise<number>;
  checkHolidayConflicts(assignment: RotaAssignment): Promise<{hasConflict: boolean, conflictingMembers: TeamMember[]}>;
}

export class DatabaseStorage implements IStorage {
  async getTeamMembers(): Promise<TeamMember[]> {
    return await db.select().from(teamMembers);
  }

  async getTeamMemberById(id: number): Promise<TeamMember | undefined> {
    const [member] = await db.select().from(teamMembers).where(eq(teamMembers.id, id));
    return member || undefined;
  }

  async getTeamMembersByRegion(region: string): Promise<TeamMember[]> {
    return await db.select().from(teamMembers).where(eq(teamMembers.region, region));
  }

  async createTeamMember(member: InsertTeamMember): Promise<TeamMember> {
    try {
      console.log('Storage: Creating team member with data:', member);
      const [newMember] = await db.insert(teamMembers).values(member).returning();
      console.log('Storage: Successfully created team member:', newMember);
      return newMember;
    } catch (error) {
      console.error('Storage: Database error creating team member:', error);
      console.error('Storage: Member data that failed:', member);
      throw error;
    }
  }

  async updateTeamMember(id: number, updates: Partial<InsertTeamMember>): Promise<TeamMember | undefined> {
    const [updatedMember] = await db
      .update(teamMembers)
      .set(updates)
      .where(eq(teamMembers.id, id))
      .returning();
    return updatedMember || undefined;
  }

  async deleteTeamMember(id: number): Promise<boolean> {
    try {
      await db.delete(teamMembers).where(eq(teamMembers.id, id));
      return true;
    } catch (error) {
      console.error("Error deleting team member:", error);
      return false;
    }
  }

  async getRotaAssignments(): Promise<RotaAssignment[]> {
    return await db.select().from(rotaAssignments);
  }

  async getRotaAssignmentById(id: number): Promise<RotaAssignment | undefined> {
    const [assignment] = await db.select().from(rotaAssignments).where(eq(rotaAssignments.id, id));
    return assignment || undefined;
  }

  async getCurrentAssignment(): Promise<RotaAssignment | undefined> {
    const today = new Date().toISOString().split('T')[0];
    const assignments = await db.select().from(rotaAssignments);
    return assignments.find(assignment => 
      assignment.startDate <= today && assignment.endDate >= today
    );
  }

  async getUpcomingAssignments(): Promise<RotaAssignment[]> {
    const today = new Date().toISOString().split('T')[0];
    const assignments = await db.select().from(rotaAssignments);
    return assignments
      .filter(assignment => assignment.startDate > today)
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
  }

  async createRotaAssignment(assignment: InsertRotaAssignment): Promise<RotaAssignment> {
    const [newAssignment] = await db.insert(rotaAssignments).values(assignment).returning();
    
    // Create history entries
    if (assignment.usMemberId) {
      await this.createRotaHistory({
        memberId: assignment.usMemberId,
        assignmentId: newAssignment.id,
        region: "us",
        startDate: assignment.startDate,
        endDate: assignment.endDate
      });
    }
    
    if (assignment.ukMemberId) {
      await this.createRotaHistory({
        memberId: assignment.ukMemberId,
        assignmentId: newAssignment.id,
        region: "uk",
        startDate: assignment.startDate,
        endDate: assignment.endDate
      });
    }
    
    return newAssignment;
  }

  async updateRotaAssignment(id: number, updates: Partial<InsertRotaAssignment>): Promise<RotaAssignment | undefined> {
    const [updatedAssignment] = await db
      .update(rotaAssignments)
      .set(updates)
      .where(eq(rotaAssignments.id, id))
      .returning();
    return updatedAssignment || undefined;
  }

  async deleteRotaAssignment(id: number): Promise<boolean> {
    try {
      // First delete related rota history records
      await db.delete(rotaHistory).where(eq(rotaHistory.assignmentId, id));
      
      // Then delete the rota assignment
      await db.delete(rotaAssignments).where(eq(rotaAssignments.id, id));
      return true;
    } catch (error) {
      console.error("Error deleting rota assignment:", error);
      return false;
    }
  }

  async getRotaHistory(): Promise<RotaHistory[]> {
    return await db.select().from(rotaHistory);
  }

  async getRotaHistoryByMember(memberId: number): Promise<RotaHistory[]> {
    return await db.select().from(rotaHistory).where(eq(rotaHistory.memberId, memberId));
  }

  async createRotaHistory(history: InsertRotaHistory): Promise<RotaHistory> {
    const [newHistory] = await db.insert(rotaHistory).values(history).returning();
    return newHistory;
  }

  async getHolidays(): Promise<Holiday[]> {
    return await db.select().from(holidays);
  }

  async getHolidaysByMember(memberId: number): Promise<Holiday[]> {
    return await db.select().from(holidays).where(eq(holidays.memberId, memberId));
  }

  async createHoliday(holiday: InsertHoliday): Promise<Holiday> {
    const [newHoliday] = await db.insert(holidays).values(holiday).returning();
    return newHoliday;
  }

  async updateHoliday(id: number, updates: Partial<InsertHoliday>): Promise<Holiday | undefined> {
    const [updatedHoliday] = await db
      .update(holidays)
      .set(updates)
      .where(eq(holidays.id, id))
      .returning();
    return updatedHoliday || undefined;
  }

  async deleteHoliday(id: number): Promise<boolean> {
    try {
      await db.delete(holidays).where(eq(holidays.id, id));
      return true;
    } catch (error) {
      console.error("Error deleting holiday:", error);
      return false;
    }
  }



  async getAvailableMembers(region: string, startDate: string, endDate: string): Promise<TeamMember[]> {
    const regionMembers = await this.getTeamMembersByRegion(region);
    
    // Filter out members who have holidays during the assignment period
    const availableMembers: TeamMember[] = [];
    
    for (const member of regionMembers) {
      const memberHolidays = await this.getHolidaysByMember(member.id);
      let hasConflict = false;
      
      const assignmentStart = new Date(startDate);
      const assignmentEnd = new Date(endDate);
      
      for (const holiday of memberHolidays) {
        const holidayStart = new Date(holiday.startDate);
        const holidayEnd = new Date(holiday.endDate);
        
        // Check for date overlap
        if (assignmentStart <= holidayEnd && assignmentEnd >= holidayStart) {
          hasConflict = true;
          break;
        }
      }
      
      if (!hasConflict) {
        availableMembers.push(member);
      }
    }
    
    return availableMembers;
  }

  async getMemberAssignmentCount(memberId: number): Promise<number> {
    const history = await this.getRotaHistoryByMember(memberId);
    return history.length;
  }

  async checkHolidayConflicts(assignment: RotaAssignment): Promise<{hasConflict: boolean, conflictingMembers: TeamMember[]}> {
    const conflictingMembers: TeamMember[] = [];
    const assignmentStart = new Date(assignment.startDate);
    const assignmentEnd = new Date(assignment.endDate);
    
    // Check US member holidays
    if (assignment.usMemberId) {
      const usMember = await this.getTeamMemberById(assignment.usMemberId);
      if (usMember) {
        const memberHolidays = await this.getHolidaysByMember(assignment.usMemberId);
        for (const holiday of memberHolidays) {
          const holidayStart = new Date(holiday.startDate);
          const holidayEnd = new Date(holiday.endDate);
          
          if (assignmentStart <= holidayEnd && assignmentEnd >= holidayStart) {
            conflictingMembers.push(usMember);
            break; // Only add member once even if multiple holidays conflict
          }
        }
      }
    }
    
    // Check UK member holidays
    if (assignment.ukMemberId) {
      const ukMember = await this.getTeamMemberById(assignment.ukMemberId);
      if (ukMember) {
        const memberHolidays = await this.getHolidaysByMember(assignment.ukMemberId);
        for (const holiday of memberHolidays) {
          const holidayStart = new Date(holiday.startDate);
          const holidayEnd = new Date(holiday.endDate);
          if (assignmentStart <= holidayEnd && assignmentEnd >= holidayStart) {
            conflictingMembers.push(ukMember);
            break; // Only add member once even if multiple holidays conflict
          }
        }
      }
    }
    
    return {
      hasConflict: conflictingMembers.length > 0,
      conflictingMembers
    };
  }
}

export const storage = new DatabaseStorage();