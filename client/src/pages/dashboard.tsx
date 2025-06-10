import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { DashboardStats } from "@/components/dashboard-stats";
import { RotaCalendar } from "@/components/rota-calendar";
import { TeamManagement } from "@/components/team-management";
import { AddMemberModal } from "@/components/add-member-modal";
import { ManualAssignModal } from "@/components/manual-assign-modal";
import { Users, Clock, User } from "lucide-react";
import type { TeamMember, RotaAssignment } from "@shared/schema";

export default function Dashboard() {
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [showManualAssignModal, setShowManualAssignModal] = useState(false);
  const [currentTime, setCurrentTime] = useState(() => {
    return new Date().toLocaleTimeString('en-US', { 
      hour12: false, 
      timeZone: 'UTC',
      hour: '2-digit', 
      minute: '2-digit' 
    }) + ' UTC';
  });

  // Update time every minute
  useState(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString('en-US', { 
        hour12: false, 
        timeZone: 'UTC',
        hour: '2-digit', 
        minute: '2-digit' 
      }) + ' UTC');
    }, 60000);
    return () => clearInterval(interval);
  });

  const { data: teamMembers = [] } = useQuery<TeamMember[]>({
    queryKey: ["/api/team-members"],
  });

  const { data: currentAssignment } = useQuery<RotaAssignment>({
    queryKey: ["/api/rota-assignments/current"],
  });

  const { data: upcomingAssignments = [] } = useQuery<RotaAssignment[]>({
    queryKey: ["/api/rota-assignments/upcoming"],
  });

  const getCurrentUSMember = () => {
    if (!currentAssignment) return null;
    return teamMembers.find(m => m.id === currentAssignment.usMemberId);
  };

  const getCurrentUKMember = () => {
    if (!currentAssignment) return null;
    return teamMembers.find(m => m.id === currentAssignment.ukMemberId);
  };

  const getDSGMember = () => {
    return teamMembers.find(m => m.isDsgMember);
  };

  const getNextRotationDate = () => {
    if (upcomingAssignments.length === 0) return "Not scheduled";
    return new Date(upcomingAssignments[0].startDate).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <Users className="text-white w-4 h-4" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-slate-900">Vaders Support Rota</h1>
                  <p className="text-xs text-slate-500">DSG Team Management</p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="hidden md:flex items-center space-x-2 text-sm text-slate-600">
                <Clock className="w-4 h-4" />
                <span>{currentTime}</span>
              </div>
              <div className="relative">
                <button className="flex items-center space-x-2 text-slate-700 hover:text-slate-900">
                  <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4" />
                  </div>
                  <span className="hidden md:block text-sm font-medium">Admin User</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <DashboardStats 
          currentUSMember={getCurrentUSMember()}
          currentUKMember={getCurrentUKMember()}
          dsgMember={getDSGMember()}
          nextRotationDate={getNextRotationDate()}
          currentAssignment={currentAssignment}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <RotaCalendar 
            teamMembers={teamMembers}
            currentAssignment={currentAssignment}
            onManualAssign={() => setShowManualAssignModal(true)}
          />
          
          <TeamManagement 
            teamMembers={teamMembers}
            onAddMember={() => setShowAddMemberModal(true)}
          />
        </div>
      </div>

      {/* Modals */}
      <AddMemberModal 
        isOpen={showAddMemberModal}
        onClose={() => setShowAddMemberModal(false)}
      />
      
      <ManualAssignModal 
        isOpen={showManualAssignModal}
        onClose={() => setShowManualAssignModal(false)}
        teamMembers={teamMembers}
      />
    </div>
  );
}
