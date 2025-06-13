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
      console.log('PATCH team member request:', { id, body: req.body });
      
      // Fix timezone offset issue for holiday dates
      const updates = { ...req.body };
      if (updates.holidayStart && typeof updates.holidayStart === 'string') {
        // Ensure date is treated as local date without timezone conversion
        updates.holidayStart = updates.holidayStart.split('T')[0]; // Keep only YYYY-MM-DD part
      }
      if (updates.holidayEnd && typeof updates.holidayEnd === 'string') {
        // Ensure date is treated as local date without timezone conversion
        updates.holidayEnd = updates.holidayEnd.split('T')[0]; // Keep only YYYY-MM-DD part
      }
      
      const member = await storage.updateTeamMember(id, updates);
      console.log('Updated member result:', member);
      
      if (member) {
        res.json(member);
      } else {
        console.log('Team member not found for id:', id);
        res.status(404).json({ message: "Team member not found" });
      }
    } catch (error) {
      console.error('Error updating team member:', error);
      res.status(500).json({ message: "Failed to update team member", error: error.message });
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
      const assignment = req.body;
      
      // Validate required fields
      if (!assignment.usMemberId && !assignment.ukMemberId) {
        return res.json({ hasConflict: false, conflictingMembers: [] });
      }
      
      const result = await storage.checkHolidayConflicts(assignment);
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
      
      // Get assignment counts for fair rotation
      const usAssignmentCounts = new Map();
      const ukAssignmentCounts = new Map();
      
      for (const member of allUSMembers) {
        const count = await storage.getMemberAssignmentCount(member.id);
        usAssignmentCounts.set(member.id, count);
      }
      
      for (const member of allUKMembers) {
        const count = await storage.getMemberAssignmentCount(member.id);
        ukAssignmentCounts.set(member.id, count);
      }
      
      // Calculate days in the period and get all weekdays
      const totalDays = Math.ceil((periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      console.log(`Processing ${totalDays} days from ${assignmentStartDate} to ${assignmentEndDate}`);
      
      const weekdays = [];
      for (let dayOffset = 0; dayOffset < totalDays; dayOffset++) {
        const currentDate = new Date(periodStart);
        currentDate.setDate(periodStart.getDate() + dayOffset);
        const dayOfWeek = currentDate.getDay();
        
        // Only include weekdays (Monday-Friday)
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
          weekdays.push(currentDate.toISOString().split('T')[0]);
        }
      }
      
      console.log(`Week contains ${weekdays.length} weekdays:`, weekdays);
      
      // Helper function to check if member is available on a specific date (async version)
      const isMemberAvailableAsync = async (member: any, dateStr: string): Promise<boolean> => {
        const checkDate = new Date(dateStr);
        const memberHolidays = await storage.getHolidaysByMember(member.id);
        
        // Check if any holiday conflicts with this date
        for (const holiday of memberHolidays) {
          const holidayStart = new Date(holiday.startDate);
          const holidayEnd = new Date(holiday.endDate);
          if (checkDate >= holidayStart && checkDate <= holidayEnd) {
            return false;
          }
        }
        
        return true;
      };
      
      // Check if member is available for ALL days in the week
      const isMemberAvailableForFullWeek = async (member: any): Promise<boolean> => {
        for (const dateStr of weekdays) {
          const isAvailable = await isMemberAvailableAsync(member, dateStr);
          if (!isAvailable) return false;
        }
        return true;
      };
      
      // Try to find members who can cover the full week first
      const fullWeekUSMembers = [];
      const fullWeekUKMembers = [];
      
      for (const member of allUSMembers) {
        if (await isMemberAvailableForFullWeek(member)) {
          fullWeekUSMembers.push(member);
        }
      }
      
      for (const member of allUKMembers) {
        if (await isMemberAvailableForFullWeek(member)) {
          fullWeekUKMembers.push(member);
        }
      }
      
      let selectedUSMember = null;
      let selectedUKMember = null;
      
      if (fullWeekUSMembers.length > 0 && fullWeekUKMembers.length > 0) {
        console.log(`Found ${fullWeekUSMembers.length} US and ${fullWeekUKMembers.length} UK members available for full week`);
        
        // Select members with lowest assignment count for full week coverage
        const minUSCount = Math.min(...fullWeekUSMembers.map(m => usAssignmentCounts.get(m.id) || 0));
        const minUKCount = Math.min(...fullWeekUKMembers.map(m => ukAssignmentCounts.get(m.id) || 0));
        
        const eligibleUSMembers = fullWeekUSMembers.filter(m => 
          (usAssignmentCounts.get(m.id) || 0) === minUSCount
        ).sort((a, b) => a.id - b.id);
        
        const eligibleUKMembers = fullWeekUKMembers.filter(m => 
          (ukAssignmentCounts.get(m.id) || 0) === minUKCount
        ).sort((a, b) => a.id - b.id);
        
        selectedUSMember = eligibleUSMembers[0];
        selectedUKMember = eligibleUKMembers[0];
        

        
        // Assign the same members for all days in the week
        for (const dateStr of weekdays) {
          const dayAssignment = await storage.createRotaAssignment({
            startDate: dateStr,
            endDate: dateStr,
            usMemberId: selectedUSMember.id,
            ukMemberId: selectedUKMember.id,
            notes: "Auto-assigned (full week)",
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
        }
        
        // Update assignment counts (once per week, not per day)
        usAssignmentCounts.set(selectedUSMember.id, (usAssignmentCounts.get(selectedUSMember.id) || 0) + weekdays.length);
        ukAssignmentCounts.set(selectedUKMember.id, (ukAssignmentCounts.get(selectedUKMember.id) || 0) + weekdays.length);
        
      } else {
        console.log("No members available for full week - falling back to day-by-day assignment");
        
        // Fall back to day-by-day assignment when no one can cover the full week
        let usRotationIndex = 0;
        let ukRotationIndex = 0;
        
        for (const dateStr of weekdays) {
          console.log(`Processing weekday: ${dateStr}`);
          
          // Filter available members for this specific day
          const dayUSMembers = [];
          const dayUKMembers = [];
          
          for (const member of allUSMembers) {
            if (await isMemberAvailableAsync(member, dateStr)) {
              dayUSMembers.push(member);
            }
          }
          
          for (const member of allUKMembers) {
            if (await isMemberAvailableAsync(member, dateStr)) {
              dayUKMembers.push(member);
            }
          }
          
          console.log(`Found ${dayUSMembers.length} US members, ${dayUKMembers.length} UK members for ${dateStr}`);
          
          if (dayUSMembers.length > 0 && dayUKMembers.length > 0) {
            // Fair rotation selection using assignment counts with proper round-robin
            const minUSCount = Math.min(...dayUSMembers.map(m => usAssignmentCounts.get(m.id) || 0));
            const minUKCount = Math.min(...dayUKMembers.map(m => ukAssignmentCounts.get(m.id) || 0));
            
            // Get members with minimum assignment count
            const eligibleUSMembers = dayUSMembers.filter(m => 
              (usAssignmentCounts.get(m.id) || 0) === minUSCount
            ).sort((a, b) => a.id - b.id); // Consistent ordering
            
            const eligibleUKMembers = dayUKMembers.filter(m => 
              (ukAssignmentCounts.get(m.id) || 0) === minUKCount
            ).sort((a, b) => a.id - b.id); // Consistent ordering
            
            // Round-robin selection within eligible members
            const dayUSMember = eligibleUSMembers[usRotationIndex % eligibleUSMembers.length];
            const dayUKMember = eligibleUKMembers[ukRotationIndex % eligibleUKMembers.length];
            
            usRotationIndex++;
            ukRotationIndex++;
            
            const dayAssignment = await storage.createRotaAssignment({
              startDate: dateStr,
              endDate: dateStr,
              usMemberId: dayUSMember.id,
              ukMemberId: dayUKMember.id,
              notes: "Auto-assigned (partial week)",
              isManual: false,
            });
            
            assignments.push({
              date: dateStr,
              usMembers: dayUSMember.name,
              ukMember: dayUKMember.name
            });
            
            await storage.createRotaHistory({
              assignmentId: dayAssignment.id,
              memberId: dayUSMember.id,
              region: "us",
              startDate: dateStr,
              endDate: dateStr,
            });
            
            await storage.createRotaHistory({
              assignmentId: dayAssignment.id,
              memberId: dayUKMember.id,
              region: "uk",
              startDate: dateStr,
              endDate: dateStr,
            });
            
            // Update assignment counts for fair rotation tracking
            usAssignmentCounts.set(dayUSMember.id, (usAssignmentCounts.get(dayUSMember.id) || 0) + 1);
            ukAssignmentCounts.set(dayUKMember.id, (ukAssignmentCounts.get(dayUKMember.id) || 0) + 1);
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
        
        // Check holiday conflicts for US members
        for (const member of allUSMembers) {
          const memberHolidays = await storage.getHolidaysByMember(member.id);
          for (const holiday of memberHolidays) {
            const holidayStart = new Date(holiday.startDate);
            const holidayEnd = new Date(holiday.endDate);
            const assignStart = new Date(assignmentStartDate);
            const assignEnd = new Date(assignmentEndDate);
            
            if (assignStart <= holidayEnd && assignEnd >= holidayStart) {
              conflictDetails.push(`${member.name} (US): On holiday ${holiday.startDate} to ${holiday.endDate}`);
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
      // Fix timezone offset issue for holiday dates
      const holidayData = { ...req.body };
      if (holidayData.startDate && typeof holidayData.startDate === 'string') {
        holidayData.startDate = holidayData.startDate.split('T')[0]; // Keep only YYYY-MM-DD part
      }
      if (holidayData.endDate && typeof holidayData.endDate === 'string') {
        holidayData.endDate = holidayData.endDate.split('T')[0]; // Keep only YYYY-MM-DD part
      }
      
      const holiday = await storage.createHoliday(holidayData);
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