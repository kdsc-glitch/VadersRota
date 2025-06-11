import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertTeamMemberSchema, insertRotaAssignmentSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Team Members routes
  app.get("/api/team-members", async (req, res) => {
    try {
      const members = await storage.getTeamMembers();
      res.json(members);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch team members" });
    }
  });

  app.get("/api/team-members/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const member = await storage.getTeamMemberById(id);
      if (!member) {
        return res.status(404).json({ message: "Team member not found" });
      }
      res.json(member);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch team member" });
    }
  });

  app.get("/api/team-members/region/:region", async (req, res) => {
    try {
      const region = req.params.region;
      const members = await storage.getTeamMembersByRegion(region);
      res.json(members);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch team members by region" });
    }
  });

  app.post("/api/team-members", async (req, res) => {
    try {
      const validatedData = insertTeamMemberSchema.parse(req.body);
      const member = await storage.createTeamMember(validatedData);
      res.status(201).json(member);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create team member" });
    }
  });

  app.patch("/api/team-members/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = insertTeamMemberSchema.partial().parse(req.body);
      const member = await storage.updateTeamMember(id, updates);
      if (!member) {
        return res.status(404).json({ message: "Team member not found" });
      }
      res.json(member);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update team member" });
    }
  });

  app.put("/api/team-members/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = insertTeamMemberSchema.partial().parse(req.body);
      const member = await storage.updateTeamMember(id, updates);
      if (!member) {
        return res.status(404).json({ message: "Team member not found" });
      }
      res.json(member);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update team member" });
    }
  });

  app.delete("/api/team-members/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteTeamMember(id);
      if (!deleted) {
        return res.status(404).json({ message: "Team member not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete team member" });
    }
  });

  // Rota Assignments routes
  app.get("/api/rota-assignments", async (req, res) => {
    try {
      const assignments = await storage.getRotaAssignments();
      res.json(assignments);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch rota assignments" });
    }
  });

  app.get("/api/rota-assignments/current", async (req, res) => {
    try {
      const assignment = await storage.getCurrentAssignment();
      if (!assignment) {
        return res.status(404).json({ message: "No current assignment found" });
      }
      res.json(assignment);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch current assignment" });
    }
  });

  app.get("/api/rota-assignments/upcoming", async (req, res) => {
    try {
      const assignments = await storage.getUpcomingAssignments();
      res.json(assignments);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch upcoming assignments" });
    }
  });

  app.post("/api/rota-assignments", async (req, res) => {
    try {
      const validatedData = insertRotaAssignmentSchema.parse(req.body);
      const assignment = await storage.createRotaAssignment(validatedData);
      res.status(201).json(assignment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create rota assignment" });
    }
  });

  app.patch("/api/rota-assignments/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = insertRotaAssignmentSchema.partial().parse(req.body);
      const assignment = await storage.updateRotaAssignment(id, updates);
      if (!assignment) {
        return res.status(404).json({ message: "Rota assignment not found" });
      }
      res.json(assignment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update rota assignment" });
    }
  });

  app.delete("/api/rota-assignments/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteRotaAssignment(id);
      if (!deleted) {
        return res.status(404).json({ message: "Rota assignment not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete rota assignment" });
    }
  });

  // Auto-assign for any week
  app.post("/api/rota-assignments/auto-assign", async (req, res) => {
    try {
      const { startDate, endDate } = req.body;
      
      // If no dates provided, use next week
      let assignmentStartDate = startDate;
      let assignmentEndDate = endDate;
      
      if (!startDate || !endDate) {
        const today = new Date();
        const nextMonday = new Date(today);
        nextMonday.setDate(today.getDate() + (8 - today.getDay()) % 7);
        const nextSunday = new Date(nextMonday);
        nextSunday.setDate(nextMonday.getDate() + 6);

        assignmentStartDate = nextMonday.toISOString().split('T')[0];
        assignmentEndDate = nextSunday.toISOString().split('T')[0];
      }

      // Get available members for each region
      const usMembers = await storage.getAvailableMembers("us", assignmentStartDate, assignmentEndDate);
      const ukMembers = await storage.getAvailableMembers("uk", assignmentStartDate, assignmentEndDate);

      if (usMembers.length === 0 || ukMembers.length === 0) {
        return res.status(400).json({ message: "Not enough available members for both regions" });
      }

      // Enhanced fair rotation: consider both assignment count and time since last assignment
      let selectedUSMember = usMembers[0];
      let selectedUKMember = ukMembers[0];
      let bestUSScore = -1;
      let bestUKScore = -1;

      // Calculate fairness score for each member (higher score = more deserving of assignment)
      for (const member of usMembers) {
        const assignmentCount = await storage.getMemberAssignmentCount(member.id);
        
        // Get the member's last assignment date to calculate time since last assignment
        const allAssignments = await storage.getRotaAssignments();
        const memberAssignments = allAssignments.filter(a => 
          a.usMemberId === member.id || a.ukMemberId === member.id
        );
        
        let daysSinceLastAssignment = 999; // Default for never assigned
        if (memberAssignments.length > 0) {
          const lastAssignment = memberAssignments.sort((a, b) => 
            new Date(b.endDate).getTime() - new Date(a.endDate).getTime()
          )[0];
          const lastDate = new Date(lastAssignment.endDate);
          const today = new Date();
          daysSinceLastAssignment = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
        }
        
        // Fairness score: prioritize members with fewer assignments and longer time since last assignment
        const fairnessScore = (daysSinceLastAssignment * 2) + ((10 - assignmentCount) * 3);
        
        if (fairnessScore > bestUSScore) {
          bestUSScore = fairnessScore;
          selectedUSMember = member;
        }
      }

      for (const member of ukMembers) {
        const assignmentCount = await storage.getMemberAssignmentCount(member.id);
        
        // Get the member's last assignment date
        const allAssignments = await storage.getRotaAssignments();
        const memberAssignments = allAssignments.filter(a => 
          a.usMemberId === member.id || a.ukMemberId === member.id
        );
        
        let daysSinceLastAssignment = 999; // Default for never assigned
        if (memberAssignments.length > 0) {
          const lastAssignment = memberAssignments.sort((a, b) => 
            new Date(b.endDate).getTime() - new Date(a.endDate).getTime()
          )[0];
          const lastDate = new Date(lastAssignment.endDate);
          const today = new Date();
          daysSinceLastAssignment = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
        }
        
        // Fairness score: prioritize members with fewer assignments and longer time since last assignment
        const fairnessScore = (daysSinceLastAssignment * 2) + ((10 - assignmentCount) * 3);
        
        if (fairnessScore > bestUKScore) {
          bestUKScore = fairnessScore;
          selectedUKMember = member;
        }
      }

      const assignment = await storage.createRotaAssignment({
        startDate: assignmentStartDate,
        endDate: assignmentEndDate,
        usMemberId: selectedUSMember.id,
        ukMemberId: selectedUKMember.id,
        notes: "Auto-assigned using fair rotation algorithm",
        isManual: false
      });

      res.status(201).json(assignment);
    } catch (error) {
      res.status(500).json({ message: "Failed to auto-assign rota" });
    }
  });

  // Fairness report
  app.get("/api/reports/fairness", async (req, res) => {
    try {
      const members = await storage.getTeamMembers();
      const report = await Promise.all(
        members.map(async (member) => {
          const assignmentCount = await storage.getMemberAssignmentCount(member.id);
          return {
            id: member.id,
            name: member.name,
            region: member.region,
            assignmentCount,
            isAvailable: member.isAvailable
          };
        })
      );
      res.json(report);
    } catch (error) {
      res.status(500).json({ message: "Failed to generate fairness report" });
    }
  });

  // xMatters integration endpoints
  app.post("/api/xmatters/test-connection", async (req, res) => {
    try {
      const { xMattersUrl, apiToken, groupId } = req.body;
      
      // Simulate xMatters API connection test
      // In a real implementation, this would make an actual HTTP request to xMatters
      if (!xMattersUrl || !apiToken || !groupId) {
        return res.status(400).json({ message: "Missing required xMatters configuration" });
      }

      // Simulate connection test
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      res.json({ 
        success: true, 
        message: "Successfully connected to xMatters",
        groupFound: true,
        memberCount: 24
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to test xMatters connection" });
    }
  });

  app.post("/api/xmatters/sync-rota", async (req, res) => {
    try {
      const { xMattersUrl, apiToken, groupId } = req.body;
      
      // Simulate fetching DSG rota from xMatters
      // In a real implementation, this would:
      // 1. Make API calls to xMatters to get current on-call schedule
      // 2. Find which Vaders team members are currently on DSG duty
      // 3. Update their isDsgMember status accordingly
      
      if (!xMattersUrl || !apiToken || !groupId) {
        return res.status(400).json({ message: "Missing required xMatters configuration" });
      }

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // For demonstration, mark Alex Kumar as the current DSG member
      const members = await storage.getTeamMembers();
      const alexKumar = members.find(m => m.name === "Alex Kumar");
      
      if (alexKumar) {
        // Reset all DSG memberships
        for (const member of members) {
          if (member.isDsgMember) {
            await storage.updateTeamMember(member.id, { isDsgMember: false });
          }
        }
        
        // Set Alex as current DSG member
        await storage.updateTeamMember(alexKumar.id, { isDsgMember: true });
      }
      
      res.json({ 
        success: true, 
        message: "Successfully synchronized with xMatters DSG rota",
        updatedMembers: 1,
        currentDsgMember: alexKumar?.name || "None"
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to sync with xMatters" });
    }
  });

  // Check holiday conflicts for an assignment
  app.post("/api/rota-assignments/check-conflicts", async (req, res) => {
    try {
      const assignment = req.body;
      const conflicts = await storage.checkHolidayConflicts(assignment);
      res.json(conflicts);
    } catch (error) {
      console.error("Error checking holiday conflicts:", error);
      res.status(500).json({ error: "Failed to check conflicts" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
