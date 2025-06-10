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

  // Auto-assign next week
  app.post("/api/rota-assignments/auto-assign", async (req, res) => {
    try {
      // Calculate next week's dates
      const today = new Date();
      const nextMonday = new Date(today);
      nextMonday.setDate(today.getDate() + (8 - today.getDay()) % 7);
      const nextSunday = new Date(nextMonday);
      nextSunday.setDate(nextMonday.getDate() + 6);

      const startDate = nextMonday.toISOString().split('T')[0];
      const endDate = nextSunday.toISOString().split('T')[0];

      // Get available members for each region
      const usMembers = await storage.getAvailableMembers("us", startDate, endDate);
      const ukMembers = await storage.getAvailableMembers("uk", startDate, endDate);

      if (usMembers.length === 0 || ukMembers.length === 0) {
        return res.status(400).json({ message: "Not enough available members for both regions" });
      }

      // Fair rotation: select member with least assignments
      let selectedUSMember = usMembers[0];
      let selectedUKMember = ukMembers[0];

      for (const member of usMembers) {
        const memberCount = await storage.getMemberAssignmentCount(member.id);
        const selectedCount = await storage.getMemberAssignmentCount(selectedUSMember.id);
        if (memberCount < selectedCount) {
          selectedUSMember = member;
        }
      }

      for (const member of ukMembers) {
        const memberCount = await storage.getMemberAssignmentCount(member.id);
        const selectedCount = await storage.getMemberAssignmentCount(selectedUKMember.id);
        if (memberCount < selectedCount) {
          selectedUKMember = member;
        }
      }

      const assignment = await storage.createRotaAssignment({
        startDate,
        endDate,
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

  const httpServer = createServer(app);
  return httpServer;
}
