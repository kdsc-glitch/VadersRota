import { teamMembers, rotaAssignments, rotaHistory, type TeamMember, type InsertTeamMember, type RotaAssignment, type InsertRotaAssignment, type RotaHistory, type InsertRotaHistory } from "@shared/schema";

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

  // Utility methods
  getAvailableMembers(region: string, startDate: string, endDate: string): Promise<TeamMember[]>;
  getMemberAssignmentCount(memberId: number): Promise<number>;
}

export class MemStorage implements IStorage {
  private teamMembers: Map<number, TeamMember>;
  private rotaAssignments: Map<number, RotaAssignment>;
  private rotaHistory: Map<number, RotaHistory>;
  private currentTeamMemberId: number;
  private currentRotaAssignmentId: number;
  private currentRotaHistoryId: number;

  constructor() {
    this.teamMembers = new Map();
    this.rotaAssignments = new Map();
    this.rotaHistory = new Map();
    this.currentTeamMemberId = 1;
    this.currentRotaAssignmentId = 1;
    this.currentRotaHistoryId = 1;
    
    // Initialize with sample data
    this.initializeData();
  }

  private initializeData() {
    // US Team Members
    const usMembers = [
      { name: "Sarah Chen", email: "sarah.chen@company.com", region: "us", role: "senior_developer", isAvailable: true, isDsgMember: false, holidayStart: null, holidayEnd: null },
      { name: "Mike Rodriguez", email: "mike.rodriguez@company.com", region: "us", role: "developer", isAvailable: true, isDsgMember: false, holidayStart: null, holidayEnd: null },
      { name: "Alex Kumar", email: "alex.kumar@company.com", region: "us", role: "team_lead", isAvailable: true, isDsgMember: true, holidayStart: null, holidayEnd: null },
    ];

    // UK Team Members
    const ukMembers = [
      { name: "James Wilson", email: "james.wilson@company.com", region: "uk", role: "senior_developer", isAvailable: true, isDsgMember: false, holidayStart: null, holidayEnd: null },
      { name: "Emma Knight", email: "emma.knight@company.com", region: "uk", role: "developer", isAvailable: true, isDsgMember: false, holidayStart: null, holidayEnd: null },
      { name: "David Parker", email: "david.parker@company.com", region: "uk", role: "developer", isAvailable: false, isDsgMember: false, holidayStart: "2024-12-10", holidayEnd: "2024-12-20" },
    ];

    [...usMembers, ...ukMembers].forEach(member => {
      const id = this.currentTeamMemberId++;
      this.teamMembers.set(id, { ...member, id });
    });

    // Current assignment
    const currentAssignment = {
      startDate: "2024-12-09",
      endDate: "2024-12-15",
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
    const newMember: TeamMember = { ...member, id };
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
}

export const storage = new MemStorage();
