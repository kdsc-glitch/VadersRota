import { db } from "./db";
import { teamMembers, rotaAssignments } from "@shared/schema";

async function seedDatabase() {
  console.log("Seeding database...");

  // Check if data already exists
  const existingMembers = await db.select().from(teamMembers);
  if (existingMembers.length > 0) {
    console.log("Database already seeded");
    return;
  }

  // Seed team members
  const sampleMembers = [
    // US Team Members
    { 
      name: "Sarah Chen", 
      email: "sarah.chen@company.com", 
      region: "us", 
      role: "senior_developer", 
      isAvailable: true, 
      isDsgMember: false, 
      holidayStart: null, 
      holidayEnd: null 
    },
    { 
      name: "Mike Rodriguez", 
      email: "mike.rodriguez@company.com", 
      region: "us", 
      role: "developer", 
      isAvailable: true, 
      isDsgMember: false, 
      holidayStart: null, 
      holidayEnd: null 
    },
    { 
      name: "Alex Kumar", 
      email: "alex.kumar@company.com", 
      region: "us", 
      role: "team_lead", 
      isAvailable: true, 
      isDsgMember: true, 
      holidayStart: null, 
      holidayEnd: null 
    },
    // UK Team Members
    { 
      name: "James Wilson", 
      email: "james.wilson@company.com", 
      region: "uk", 
      role: "senior_developer", 
      isAvailable: true, 
      isDsgMember: false, 
      holidayStart: null, 
      holidayEnd: null 
    },
    { 
      name: "Emma Knight", 
      email: "emma.knight@company.com", 
      region: "uk", 
      role: "developer", 
      isAvailable: true, 
      isDsgMember: false, 
      holidayStart: null, 
      holidayEnd: null 
    },
    { 
      name: "David Parker", 
      email: "david.parker@company.com", 
      region: "uk", 
      role: "developer", 
      isAvailable: false, 
      isDsgMember: false, 
      holidayStart: "2024-12-10", 
      holidayEnd: "2024-12-20" 
    },
  ];

  await db.insert(teamMembers).values(sampleMembers);

  // Create current assignment for this week
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
    notes: "Initial weekly rotation",
    isManual: false,
  };

  await db.insert(rotaAssignments).values(currentAssignment);

  console.log("Database seeded successfully");
}

export { seedDatabase };

// Run seeding if this file is executed directly
seedDatabase().catch(console.error);