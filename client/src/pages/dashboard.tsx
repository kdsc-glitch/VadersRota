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
                {/* Fun Team Logo */}
                <div className="relative">
                  <svg width="48" height="48" viewBox="0 0 48 48" className="drop-shadow-sm">
                    <defs>
                      <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" style={{stopColor:'#3B82F6'}} />
                        <stop offset="100%" style={{stopColor:'#1D4ED8'}} />
                      </linearGradient>
                    </defs>
                    
                    {/* Main circle */}
                    <circle cx="24" cy="24" r="20" fill="url(#logoGrad)" stroke="#E2E8F0" strokeWidth="2"/>
                    
                    {/* Calendar */}
                    <rect x="16" y="18" width="16" height="12" rx="2" fill="white" opacity="0.9"/>
                    <rect x="16" y="18" width="16" height="3" rx="2" fill="white"/>
                    
                    {/* Colorful dots for team members */}
                    <circle cx="19" cy="23" r="1.2" fill="#3B82F6"/>
                    <circle cx="24" cy="23" r="1.2" fill="#10B981"/>
                    <circle cx="29" cy="23" r="1.2" fill="#F59E0B"/>
                    <circle cx="19" cy="26" r="1.2" fill="#EF4444"/>
                    <circle cx="24" cy="26" r="1.2" fill="#8B5CF6"/>
                    <circle cx="29" cy="26" r="1.2" fill="#06B6D4"/>
                    
                    {/* Rotating clock hand for fun */}
                    <g transform="translate(38, 10)">
                      <circle cx="0" cy="0" r="6" fill="none" stroke="#E2E8F0" strokeWidth="1"/>
                      <line x1="0" y1="0" x2="0" y2="-4" stroke="#3B82F6" strokeWidth="1.5" strokeLinecap="round">
                        <animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="8s" repeatCount="indefinite"/>
                      </line>
                      <circle cx="0" cy="0" r="0.8" fill="#1E293B"/>
                    </g>
                  </svg>
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
