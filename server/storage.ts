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
  getAvailableMembers(region: string, startDate: string, endDate: string): Promise<TeamMember[]>;
  getMemberAssignmentCount(memberId: number): Promise<number>;
  checkHolidayConflicts(assignment: RotaAssignment): Promise<{hasConflict: boolean, conflictingMembers: TeamMember[]}>;
}

export class DatabaseStorage implements IStorage {
  async getTeamMembers(): Promise<TeamMember[]> {
    const members = await db.select().from(teamMembers);
    return members;
  }

  async getTeamMemberById(id: number): Promise<TeamMember | undefined> {
    const [member] = await db.select().from(teamMembers).where(eq(teamMembers.id, id));
    return member || undefined;
  }

  async getTeamMembersByRegion(region: string): Promise<TeamMember[]> {
    const members = await db.select().from(teamMembers).where(eq(teamMembers.region, region));
    return members;
  }

  async createTeamMember(member: InsertTeamMember): Promise<TeamMember> {
    const [newMember] = await db
      .insert(teamMembers)
      .values(member)
      .returning();
    return newMember;
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
    const result = await db.delete(teamMembers).where(eq(teamMembers.id, id));
    return result.rowCount! > 0;
  }

  async getRotaAssignments(): Promise<RotaAssignment[]> {
    const assignments = await db.select().from(rotaAssignments).orderBy(rotaAssignments.startDate);
    return assignments;
  }

  async getRotaAssignmentById(id: number): Promise<RotaAssignment | undefined> {
    const [assignment] = await db.select().from(rotaAssignments).where(eq(rotaAssignments.id, id));
    return assignment || undefined;
  }

  async getCurrentAssignment(): Promise<RotaAssignment | undefined> {
    const today = new Date().toISOString().split('T')[0];
    const [assignment] = await db
      .select()
      .from(rotaAssignments)
      .where(eq(rotaAssignments.startDate, today))
      .limit(1);
    
    if (assignment) return assignment;
    
    // If no exact match, find assignment that spans today
    const assignments = await db.select().from(rotaAssignments);
    return assignments.find(a => a.startDate <= today && a.endDate >= today);
  }

  async getUpcomingAssignments(): Promise<RotaAssignment[]> {
    const today = new Date().toISOString().split('T')[0];
    const assignments = await db.select().from(rotaAssignments);
    return assignments
      .filter(assignment => assignment.startDate > today)
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
  }

  async createRotaAssignment(assignment: InsertRotaAssignment): Promise<RotaAssignment> {
    const [newAssignment] = await db
      .insert(rotaAssignments)
      .values(assignment)
      .returning();
    
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
      // First delete related history records
      await db.delete(rotaHistory).where(eq(rotaHistory.assignmentId, id));
      
      // Then delete the assignment
      const result = await db.delete(rotaAssignments).where(eq(rotaAssignments.id, id));
      return true; // If no error thrown, deletion was successful
    } catch (error) {
      console.error("Error deleting assignment:", error);
      return false;
    }
  }

  async getRotaHistory(): Promise<RotaHistory[]> {
    const history = await db.select().from(rotaHistory);
    return history;
  }

  async getRotaHistoryByMember(memberId: number): Promise<RotaHistory[]> {
    const history = await db.select().from(rotaHistory).where(eq(rotaHistory.memberId, memberId));
    return history;
  }

  async createRotaHistory(history: InsertRotaHistory): Promise<RotaHistory> {
    const [newHistory] = await db
      .insert(rotaHistory)
      .values(history)
      .returning();
    return newHistory;
  }

  async getHolidays(): Promise<Holiday[]> {
    const allHolidays = await db.select().from(holidays);
    return allHolidays;
  }

  async getHolidaysByMember(memberId: number): Promise<Holiday[]> {
    const memberHolidays = await db.select().from(holidays).where(eq(holidays.memberId, memberId));
    return memberHolidays;
  }

  async createHoliday(holiday: InsertHoliday): Promise<Holiday> {
    const [newHoliday] = await db
      .insert(holidays)
      .values(holiday)
      .returning();
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
    
    return regionMembers.filter(member => {
      // Check if member is available
      if (!member.isAvailable) return false;
      
      // Check if member is on holiday during the period
      if (member.holidayStart && member.holidayEnd) {
        const memberHolidayStart = new Date(member.holidayStart);
        const memberHolidayEnd = new Date(member.holidayEnd);
        const assignmentStart = new Date(startDate);
        const assignmentEnd = new Date(endDate);
        
        // Check for overlap
        if (assignmentStart <= memberHolidayEnd && assignmentEnd >= memberHolidayStart) {
          return false;
        }
      }
      
      return true;
    });
  }

  async getMemberAssignmentCount(memberId: number): Promise<number> {
    const history = await this.getRotaHistoryByMember(memberId);
    return history.length;
  }

  async checkHolidayConflicts(assignment: RotaAssignment): Promise<{hasConflict: boolean, conflictingMembers: TeamMember[]}> {
    const conflictingMembers: TeamMember[] = [];
    
    // Check US member
    if (assignment.usMemberId) {
      const usMember = await this.getTeamMemberById(assignment.usMemberId);
      if (usMember && usMember.holidayStart && usMember.holidayEnd) {
        const holidayStart = new Date(usMember.holidayStart);
        const holidayEnd = new Date(usMember.holidayEnd);
        const assignmentStart = new Date(assignment.startDate);
        const assignmentEnd = new Date(assignment.endDate);
        
        // Check for overlap
        if (assignmentStart <= holidayEnd && assignmentEnd >= holidayStart) {
          conflictingMembers.push(usMember);
        }
      }
    }
    
    // Check UK member
    if (assignment.ukMemberId) {
      const ukMember = await this.getTeamMemberById(assignment.ukMemberId);
      if (ukMember && ukMember.holidayStart && ukMember.holidayEnd) {
        const holidayStart = new Date(ukMember.holidayStart);
        const holidayEnd = new Date(ukMember.holidayEnd);
        const assignmentStart = new Date(assignment.startDate);
        const assignmentEnd = new Date(assignment.endDate);
        
        // Check for overlap
        if (assignmentStart <= holidayEnd && assignmentEnd >= holidayStart) {
          conflictingMembers.push(ukMember);
        }
      }
    }
    
    return {
      hasConflict: conflictingMembers.length > 0,
      conflictingMembers
    };
  }
}

export class MemStorage implements IStorage {
  private teamMembers: Map<number, TeamMember>;
  private rotaAssignments: Map<number, RotaAssignment>;
  private rotaHistory: Map<number, RotaHistory>;
  private holidays: Map<number, Holiday>;
  private currentTeamMemberId: number;
  private currentRotaAssignmentId: number;
  private currentRotaHistoryId: number;
  private currentHolidayId: number;

  constructor() {
    this.teamMembers = new Map();
    this.rotaAssignments = new Map();
    this.rotaHistory = new Map();
    this.holidays = new Map();
    this.currentTeamMemberId = 1;
    this.currentRotaAssignmentId = 1;
    this.currentRotaHistoryId = 1;
    this.currentHolidayId = 1;
    
    // Initialize with sample data
    this.initializeData();
  }

  private initializeData() {
    // US Team Members
    const usMembers: Omit<TeamMember, 'id'>[] = [
      { name: "Sarah Chen", email: "sarah.chen@company.com", region: "us", role: "senior_developer", isAvailable: true, isDsgMember: false, holidayStart: null, holidayEnd: null },
      { name: "Mike Rodriguez", email: "mike.rodriguez@company.com", region: "us", role: "developer", isAvailable: true, isDsgMember: false, holidayStart: null, holidayEnd: null },
      { name: "Alex Kumar", email: "alex.kumar@company.com", region: "us", role: "team_lead", isAvailable: true, isDsgMember: true, holidayStart: null, holidayEnd: null },
    ];

    // UK Team Members
    const ukMembers: Omit<TeamMember, 'id'>[] = [
      { name: "James Wilson", email: "james.wilson@company.com", region: "uk", role: "senior_developer", isAvailable: true, isDsgMember: false, holidayStart: null, holidayEnd: null },
      { name: "Emma Knight", email: "emma.knight@company.com", region: "uk", role: "developer", isAvailable: true, isDsgMember: false, holidayStart: null, holidayEnd: null },
      { name: "David Parker", email: "david.parker@company.com", region: "uk", role: "developer", isAvailable: false, isDsgMember: false, holidayStart: "2024-12-10", holidayEnd: "2024-12-20" },
    ];

    [...usMembers, ...ukMembers].forEach(member => {
      const id = this.currentTeamMemberId++;
      this.teamMembers.set(id, { ...member, id });
    });

    // Current assignment - set to current week
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay() + 1); // Monday
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6); // Sunday

    const currentAssignment = {
      startDate: startOfWeek.toISOString().split('T')[0],
      endDate: endOfWeek.toISOString().split('T')[0],
      usMemberId: 1, // Sarah Chen
      ukMemberId: 4, // James Wilson
      notes: "Regular weekly rotation",
      isManual: false,
      createdAt: new Date(),
    };
    
    const assignmentId = this.currentRotaAssignmentId++;
    this.rotaAssignments.set(assignmentId, { ...currentAssignment, id: assignmentId });
  }

  async getTeamMembers(): Promise<TeamMember[]> {
    return Array.from(this.teamMembers.values());
  }

  async getTeamMemberById(id: number): Promise<TeamMember | undefined> {
    return this.teamMembers.get(id);
  }

  async getTeamMembersByRegion(region: string): Promise<TeamMember[]> {
    return Array.from(this.teamMembers.values()).filter(member => member.region === region);
  }

  async createTeamMember(member: InsertTeamMember): Promise<TeamMember> {
    const id = this.currentTeamMemberId++;
    const newMember: TeamMember = { 
      ...member, 
      id,
      role: member.role || "developer",
      isAvailable: member.isAvailable ?? true,
      isDsgMember: member.isDsgMember ?? false,
      holidayStart: member.holidayStart || null,
      holidayEnd: member.holidayEnd || null
    };
    this.teamMembers.set(id, newMember);
    return newMember;
  }

  async updateTeamMember(id: number, updates: Partial<InsertTeamMember>): Promise<TeamMember | undefined> {
    const member = this.teamMembers.get(id);
    if (!member) return undefined;
    
    const updatedMember = { ...member, ...updates };
    this.teamMembers.set(id, updatedMember);
    return updatedMember;
  }

  async deleteTeamMember(id: number): Promise<boolean> {
    return this.teamMembers.delete(id);
  }

  async getRotaAssignments(): Promise<RotaAssignment[]> {
    return Array.from(this.rotaAssignments.values()).sort((a, b) => 
      new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
    );
  }

  async getRotaAssignmentById(id: number): Promise<RotaAssignment | undefined> {
    return this.rotaAssignments.get(id);
  }

  async getCurrentAssignment(): Promise<RotaAssignment | undefined> {
    const today = new Date().toISOString().split('T')[0];
    return Array.from(this.rotaAssignments.values()).find(assignment => 
      assignment.startDate <= today && assignment.endDate >= today
    );
  }

  async getUpcomingAssignments(): Promise<RotaAssignment[]> {
    const today = new Date().toISOString().split('T')[0];
    return Array.from(this.rotaAssignments.values())
      .filter(assignment => assignment.startDate > today)
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
  }

  async createRotaAssignment(assignment: InsertRotaAssignment): Promise<RotaAssignment> {
    const id = this.currentRotaAssignmentId++;
    const newAssignment: RotaAssignment = { 
      ...assignment, 
      id,
      usMemberId: assignment.usMemberId || null,
      ukMemberId: assignment.ukMemberId || null,
      notes: assignment.notes || null,
      isManual: assignment.isManual ?? false,
      createdAt: new Date()
    };
    this.rotaAssignments.set(id, newAssignment);
    
    // Create history entries
    if (assignment.usMemberId) {
      await this.createRotaHistory({
        memberId: assignment.usMemberId,
        assignmentId: id,
        region: "us",
        startDate: assignment.startDate,
        endDate: assignment.endDate
      });
    }
    
    if (assignment.ukMemberId) {
      await this.createRotaHistory({
        memberId: assignment.ukMemberId,
        assignmentId: id,
        region: "uk",
        startDate: assignment.startDate,
        endDate: assignment.endDate
      });
    }
    
    return newAssignment;
  }

  async updateRotaAssignment(id: number, updates: Partial<InsertRotaAssignment>): Promise<RotaAssignment | undefined> {
    const assignment = this.rotaAssignments.get(id);
    if (!assignment) return undefined;
    
    const updatedAssignment = { ...assignment, ...updates };
    this.rotaAssignments.set(id, updatedAssignment);
    return updatedAssignment;
  }

  async deleteRotaAssignment(id: number): Promise<boolean> {
    return this.rotaAssignments.delete(id);
  }

  async getRotaHistory(): Promise<RotaHistory[]> {
    return Array.from(this.rotaHistory.values());
  }

  async getRotaHistoryByMember(memberId: number): Promise<RotaHistory[]> {
    return Array.from(this.rotaHistory.values()).filter(history => history.memberId === memberId);
  }

  async createRotaHistory(history: InsertRotaHistory): Promise<RotaHistory> {
    const id = this.currentRotaHistoryId++;
    const newHistory: RotaHistory = { ...history, id };
    this.rotaHistory.set(id, newHistory);
    return newHistory;
  }

  async getAvailableMembers(region: string, startDate: string, endDate: string): Promise<TeamMember[]> {
    const regionMembers = await this.getTeamMembersByRegion(region);
    
    return regionMembers.filter(member => {
      // Check if member is available
      if (!member.isAvailable) return false;
      
      // Check if member is on holiday during the period
      if (member.holidayStart && member.holidayEnd) {
        const memberHolidayStart = new Date(member.holidayStart);
        const memberHolidayEnd = new Date(member.holidayEnd);
        const assignmentStart = new Date(startDate);
        const assignmentEnd = new Date(endDate);
        
        // Check for overlap
        if (assignmentStart <= memberHolidayEnd && assignmentEnd >= memberHolidayStart) {
          return false;
        }
      }
      
      return true;
    });
  }

  async getMemberAssignmentCount(memberId: number): Promise<number> {
    const history = await this.getRotaHistoryByMember(memberId);
    return history.length;
  }

  async checkHolidayConflicts(assignment: RotaAssignment): Promise<{hasConflict: boolean, conflictingMembers: TeamMember[]}> {
    const conflictingMembers: TeamMember[] = [];
    
    // Check US member
    if (assignment.usMemberId) {
      const usMember = await this.getTeamMemberById(assignment.usMemberId);
      if (usMember && usMember.holidayStart && usMember.holidayEnd) {
        const holidayStart = new Date(usMember.holidayStart);
        const holidayEnd = new Date(usMember.holidayEnd);
        const assignmentStart = new Date(assignment.startDate);
        const assignmentEnd = new Date(assignment.endDate);
        
        // Check for overlap
        if (assignmentStart <= holidayEnd && assignmentEnd >= holidayStart) {
          conflictingMembers.push(usMember);
        }
      }
    }
    
    // Check UK member
    if (assignment.ukMemberId) {
      const ukMember = await this.getTeamMemberById(assignment.ukMemberId);
      if (ukMember && ukMember.holidayStart && ukMember.holidayEnd) {
        const holidayStart = new Date(ukMember.holidayStart);
        const holidayEnd = new Date(ukMember.holidayEnd);
        const assignmentStart = new Date(assignment.startDate);
        const assignmentEnd = new Date(assignment.endDate);
        
        // Check for overlap
        if (assignmentStart <= holidayEnd && assignmentEnd >= holidayStart) {
          conflictingMembers.push(ukMember);
        }
      }
    }
    
    return {
      hasConflict: conflictingMembers.length > 0,
      conflictingMembers
    };
  }

  // Holiday methods for MemStorage
  async getHolidays(): Promise<Holiday[]> {
    return Array.from(this.holidays.values());
  }

  async getHolidaysByMember(memberId: number): Promise<Holiday[]> {
    return Array.from(this.holidays.values()).filter(h => h.memberId === memberId);
  }

  async createHoliday(holiday: InsertHoliday): Promise<Holiday> {
    const id = this.currentHolidayId++;
    const newHoliday: Holiday = { 
      ...holiday, 
      id, 
      createdAt: new Date(),
      description: holiday.description ?? null
    };
    this.holidays.set(id, newHoliday);
    return newHoliday;
  }

  async updateHoliday(id: number, updates: Partial<InsertHoliday>): Promise<Holiday | undefined> {
    const existing = this.holidays.get(id);
    if (!existing) return undefined;
    
    const updated = { ...existing, ...updates };
    this.holidays.set(id, updated);
    return updated;
  }

  async deleteHoliday(id: number): Promise<boolean> {
    return this.holidays.delete(id);
  }
}

export const storage = new DatabaseStorage();
