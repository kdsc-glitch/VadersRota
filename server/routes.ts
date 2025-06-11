import type { Request, Response, NextFunction } from "express";
import type { Express } from "express";
import type { Server } from "http";
import { createServer } from "http";
import { storage } from "./storage";
import { insertRotaAssignmentSchema, insertHolidaySchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Get all team members
  app.get("/api/team-members", async (req, res) => {
    try {
      const members = await storage.getTeamMembers();
      res.json(members);
    } catch (error) {
      console.error('Error fetching team members:', error);
      res.status(500).json({ message: "Failed to fetch team members" });
    }
  });

  // Create team member
  app.post("/api/team-members", async (req, res) => {
    try {
      const member = await storage.createTeamMember(req.body);
      res.status(201).json(member);
    } catch (error) {
      console.error('Error creating team member:', error);
      res.status(500).json({ message: "Failed to create team member" });
    }
  });

  // Update team member
  app.patch("/api/team-members/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const member = await storage.updateTeamMember(id, req.body);
      if (member) {
        res.json(member);
      } else {
        res.status(404).json({ message: "Team member not found" });
      }
    } catch (error) {
      console.error('Error updating team member:', error);
      res.status(500).json({ message: "Failed to update team member" });
    }
  });

  // Delete team member
  app.delete("/api/team-members/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteTeamMember(id);
      if (success) {
        res.status(204).send();
      } else {
        res.status(404).json({ message: "Team member not found" });
      }
    } catch (error) {
      console.error('Error deleting team member:', error);
      res.status(500).json({ message: "Failed to delete team member" });
    }
  });

  // Get all rota assignments
  app.get("/api/rota-assignments", async (req, res) => {
    try {
      const assignments = await storage.getRotaAssignments();
      res.json(assignments);
    } catch (error) {
      console.error('Error fetching rota assignments:', error);
      res.status(500).json({ message: "Failed to fetch rota assignments" });
    }
  });

  // Create rota assignment
  app.post("/api/rota-assignments", async (req, res) => {
    try {
      const assignment = await storage.createRotaAssignment(req.body);
      res.status(201).json(assignment);
    } catch (error) {
      console.error('Error creating rota assignment:', error);
      res.status(500).json({ message: "Failed to create rota assignment" });
    }
  });

  // Update rota assignment
  app.patch("/api/rota-assignments/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const assignment = await storage.updateRotaAssignment(id, req.body);
      if (assignment) {
        res.json(assignment);
      } else {
        res.status(404).json({ message: "Rota assignment not found" });
      }
    } catch (error) {
      console.error('Error updating rota assignment:', error);
      res.status(500).json({ message: "Failed to update rota assignment" });
    }
  });

  // Delete rota assignment
  app.delete("/api/rota-assignments/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteRotaAssignment(id);
      if (success) {
        res.status(204).send();
      } else {
        res.status(404).json({ message: "Rota assignment not found" });
      }
    } catch (error) {
      console.error('Error deleting rota assignment:', error);
      res.status(500).json({ message: "Failed to delete rota assignment" });
    }
  });

  // Get current assignment
  app.get("/api/rota-assignments/current", async (req, res) => {
    try {
      const assignment = await storage.getCurrentAssignment();
      if (assignment) {
        res.json(assignment);
      } else {
        res.status(404).json({ message: "No current assignment found" });
      }
    } catch (error) {
      console.error('Error fetching current assignment:', error);
      res.status(500).json({ message: "Failed to fetch current assignment" });
    }
  });

  // Get upcoming assignments
  app.get("/api/rota-assignments/upcoming", async (req, res) => {
    try {
      const assignments = await storage.getUpcomingAssignments();
      res.json(assignments);
    } catch (error) {
      console.error('Error fetching upcoming assignments:', error);
      res.status(500).json({ message: "Failed to fetch upcoming assignments" });
    }
  });

  // Check holiday conflicts for an assignment
  app.post("/api/rota-assignments/check-conflicts", async (req, res) => {
    try {
      const result = await storage.checkHolidayConflicts(req.body);
      res.json(result);
    } catch (error) {
      console.error('Error checking holiday conflicts:', error);
      res.status(500).json({ message: "Failed to check holiday conflicts" });
    }
  });

  // Auto-assign with partial assignment capability
  app.post("/api/rota-assignments/auto-assign", async (req, res) => {
    try {
      const { startDate, endDate } = req.body;
      
      let assignmentStartDate = startDate;
      let assignmentEndDate = endDate;
      
      if (!startDate || !endDate) {
        const today = new Date();
        let attemptDate = new Date(today);
        let weekFound = false;
        let attempts = 0;
        
        while (!weekFound && attempts < 8) {
          const nextMonday = new Date(attemptDate);
          nextMonday.setDate(attemptDate.getDate() + (8 - attemptDate.getDay()) % 7);
          const nextSunday = new Date(nextMonday);
          nextSunday.setDate(nextMonday.getDate() + 6);

          const testStartDate = nextMonday.toISOString().split('T')[0];
          const testEndDate = nextSunday.toISOString().split('T')[0];
          
          const testUSMembers = await storage.getAvailableMembers("us", testStartDate, testEndDate);
          const testUKMembers = await storage.getAvailableMembers("uk", testStartDate, testEndDate);
          
          if (testUSMembers.length > 0 && testUKMembers.length > 0) {
            assignmentStartDate = testStartDate;
            assignmentEndDate = testEndDate;
            weekFound = true;
          } else {
            attemptDate.setDate(attemptDate.getDate() + 7);
            attempts++;
          }
        }
        
        if (!weekFound) {
          return res.status(400).json({ 
            message: "No available weeks found in the next 8 weeks. Please check team availability or assign manually." 
          });
        }
      }

      console.log('Starting partial assignment process...');
      
      const periodStart = new Date(assignmentStartDate);
      const periodEnd = new Date(assignmentEndDate);
      const assignments = [];
      const skippedDays = [];
      
      // Pre-fetch all data once
      const allUSMembers = await storage.getTeamMembersByRegion("us");
      const allUKMembers = await storage.getTeamMembersByRegion("uk");
      
      // Calculate days in the period
      const totalDays = Math.ceil((periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      console.log(`Processing ${totalDays} days from ${assignmentStartDate} to ${assignmentEndDate}`);
      
      // Helper function to check if member is available on a specific date
      const isMemberAvailable = (member: any, dateStr: string): boolean => {
        if (!member.isAvailable) return false;
        
        const checkDate = new Date(dateStr);
        
        // Check unavailable period
        if (member.unavailableStart && member.unavailableEnd) {
          const unavailableStart = new Date(member.unavailableStart);
          const unavailableEnd = new Date(member.unavailableEnd);
          if (checkDate >= unavailableStart && checkDate <= unavailableEnd) {
            return false;
          }
        }
        
        // Check holiday period
        if (member.holidayStart && member.holidayEnd) {
          const holidayStart = new Date(member.holidayStart);
          const holidayEnd = new Date(member.holidayEnd);
          if (checkDate >= holidayStart && checkDate <= holidayEnd) {
            return false;
          }
        }
        
        return true;
      };
      
      for (let dayOffset = 0; dayOffset < totalDays; dayOffset++) {
        const currentDate = new Date(periodStart);
        currentDate.setDate(periodStart.getDate() + dayOffset);
        const dateStr = currentDate.toISOString().split('T')[0];
        
        console.log(`Processing date: ${dateStr}`);
        
        // Filter available members for this specific day
        const dayUSMembers = allUSMembers.filter(member => isMemberAvailable(member, dateStr));
        const dayUKMembers = allUKMembers.filter(member => isMemberAvailable(member, dateStr));
        
        console.log(`Found ${dayUSMembers.length} US members, ${dayUKMembers.length} UK members for ${dateStr}`);
        
        if (dayUSMembers.length > 0 && dayUKMembers.length > 0) {
          // Simple selection - use first available member for now to avoid performance issues
          const selectedUSMember = dayUSMembers[0];
          const selectedUKMember = dayUKMembers[0];
          
          const dayAssignment = await storage.createRotaAssignment({
            startDate: dateStr,
            endDate: dateStr,
            usMemberId: selectedUSMember.id,
            ukMemberId: selectedUKMember.id,
            notes: "Auto-assigned (partial week)",
            isManual: false,
          });
          
          assignments.push({
            date: dateStr,
            usMembers: selectedUSMember.name,
            ukMember: selectedUKMember.name
          });
          
          await storage.createRotaHistory({
            assignmentId: dayAssignment.id,
            memberId: selectedUSMember.id,
            region: "us",
            startDate: dateStr,
            endDate: dateStr,
          });
          
          await storage.createRotaHistory({
            assignmentId: dayAssignment.id,
            memberId: selectedUKMember.id,
            region: "uk",
            startDate: dateStr,
            endDate: dateStr,
          });
        } else {
          const reasonUS = dayUSMembers.length === 0 ? "No US members available" : "";
          const reasonUK = dayUKMembers.length === 0 ? "No UK members available" : "";
          const reason = [reasonUS, reasonUK].filter(r => r).join(", ");
          
          skippedDays.push({
            date: dateStr,
            reason: reason
          });
        }
      }
      
      if (assignments.length > 0) {
        return res.status(201).json({
          message: `Partial assignment completed: ${assignments.length} days assigned, ${skippedDays.length} days skipped`,
          assignments,
          skippedDays,
          period: `${assignmentStartDate} to ${assignmentEndDate}`
        });
      } else {
        const allUSMembers = await storage.getTeamMembersByRegion("us");
        const allUKMembers = await storage.getTeamMembersByRegion("uk");
        const conflictDetails = [];
        
        for (const member of allUSMembers) {
          if (!member.isAvailable) {
            conflictDetails.push(`${member.name} (US): Currently unavailable`);
          } else if (member.holidayStart && member.holidayEnd) {
            const holidayStart = new Date(member.holidayStart);
            const holidayEnd = new Date(member.holidayEnd);
            const assignStart = new Date(assignmentStartDate);
            const assignEnd = new Date(assignmentEndDate);
            
            if (assignStart <= holidayEnd && assignEnd >= holidayStart) {
              conflictDetails.push(`${member.name} (US): On holiday ${member.holidayStart} to ${member.holidayEnd}`);
            }
          }
        }
        
        return res.status(400).json({ 
          message: "No days could be assigned - conflicts on all days",
          period: `${assignmentStartDate} to ${assignmentEndDate}`,
          conflicts: conflictDetails,
          skippedDays
        });
      }
    } catch (error) {
      console.error('Error in auto-assign:', error);
      res.status(500).json({ message: "Failed to auto-assign" });
    }
  });

  // Get rota history
  app.get("/api/rota-history", async (req, res) => {
    try {
      const history = await storage.getRotaHistory();
      res.json(history);
    } catch (error) {
      console.error('Error fetching rota history:', error);
      res.status(500).json({ message: "Failed to fetch rota history" });
    }
  });

  // Get holidays
  app.get("/api/holidays", async (req, res) => {
    try {
      const holidays = await storage.getHolidays();
      res.json(holidays);
    } catch (error) {
      console.error('Error fetching holidays:', error);
      res.status(500).json({ message: "Failed to fetch holidays" });
    }
  });

  // Get holidays by member
  app.get("/api/holidays/member/:memberId", async (req, res) => {
    try {
      const memberId = parseInt(req.params.memberId);
      const holidays = await storage.getHolidaysByMember(memberId);
      res.json(holidays);
    } catch (error) {
      console.error('Error fetching member holidays:', error);
      res.status(500).json({ message: "Failed to fetch member holidays" });
    }
  });

  // Create holiday
  app.post("/api/holidays", async (req, res) => {
    try {
      const holiday = await storage.createHoliday(req.body);
      res.status(201).json(holiday);
    } catch (error) {
      console.error('Error creating holiday:', error);
      res.status(500).json({ message: "Failed to create holiday" });
    }
  });

  // Update holiday
  app.patch("/api/holidays/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const holiday = await storage.updateHoliday(id, req.body);
      if (holiday) {
        res.json(holiday);
      } else {
        res.status(404).json({ message: "Holiday not found" });
      }
    } catch (error) {
      console.error('Error updating holiday:', error);
      res.status(500).json({ message: "Failed to update holiday" });
    }
  });

  // Delete holiday
  app.delete("/api/holidays/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteHoliday(id);
      if (success) {
        res.status(204).send();
      } else {
        res.status(404).json({ message: "Holiday not found" });
      }
    } catch (error) {
      console.error('Error deleting holiday:', error);
      res.status(500).json({ message: "Failed to delete holiday" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}