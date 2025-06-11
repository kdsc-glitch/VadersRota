import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Plus, FlagIcon, Edit, Wand2, CalendarX, TrendingUp, Loader2, Sparkles } from "lucide-react";
import { useState } from "react";
import { HolidayManagementModal } from "./holiday-management-modal";
import { FairnessReportModal } from "./fairness-report-modal";
import { SimpleEditMemberModal } from "./simple-edit-member-modal";
import type { TeamMember } from "@shared/schema";

interface TeamManagementProps {
  teamMembers: TeamMember[];
  onAddMember: () => void;
}

export function TeamManagement({ teamMembers, onAddMember }: TeamManagementProps) {
  const { toast } = useToast();
  const [showHolidayModal, setShowHolidayModal] = useState(false);
  const [showFairnessModal, setShowFairnessModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);

  const [loadingStageTeam, setLoadingStageTeam] = useState<string>("");
  
  const autoAssignMutation = useMutation({
    mutationFn: async () => {
      // Enhanced loading stages with realistic timing
      setLoadingStageTeam("Analyzing team availability...");
      await new Promise(resolve => setTimeout(resolve, 700));
      
      setLoadingStageTeam("Applying fair rotation algorithm...");
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setLoadingStageTeam("Checking holiday conflicts...");
      await new Promise(resolve => setTimeout(resolve, 400));
      
      setLoadingStageTeam("Finalizing assignments...");
      
      return apiRequest("POST", "/api/rota-assignments/auto-assign");
    },
    onSuccess: () => {
      setLoadingStageTeam("Assignment complete!");
      setTimeout(() => setLoadingStageTeam(""), 1000);
      
      queryClient.invalidateQueries({ queryKey: ["/api/rota-assignments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/rota-assignments/current"] });
      queryClient.invalidateQueries({ queryKey: ["/api/rota-assignments/upcoming"] });
      
      toast({
        title: "Auto-Assignment Complete",
        description: "Next week's support rotation has been automatically assigned",
      });
    },
    onError: (error: any) => {
      setLoadingStageTeam("");
      
      // Extract error details from response
      const errorData = error.response?.data || error.data || {};
      console.log('Team management auto-assign error:', errorData);
      
      let errorMessage = "Failed to auto-assign next week's rotation";
      
      if (errorData.message) {
        errorMessage = errorData.message;
        
        if (errorData.conflicts && errorData.conflicts.length > 0) {
          errorMessage += `\n\nConflicts:\n${errorData.conflicts.join('\n')}`;
        }
        
        if (errorData.period) {
          errorMessage += `\n\nPeriod: ${errorData.period}`;
        }
      }
      
      toast({
        title: "Auto-Assignment Failed",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const usMembers = teamMembers.filter(m => m.region === "us");
  const ukMembers = teamMembers.filter(m => m.region === "uk");

  const getStatusBadge = (member: TeamMember) => {
    if (!member.isAvailable) {
      return (
        <Badge variant="secondary" className="bg-amber-100 text-amber-800">
          Holiday
        </Badge>
      );
    }

    return (
      <Badge variant="secondary" className="bg-green-100 text-green-800">
        Available
      </Badge>
    );
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('');
  };

  const handleEditMember = (member: TeamMember) => {
    setSelectedMember(member);
    setShowEditModal(true);
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setSelectedMember(null);
  };

  return (
    <div className="space-y-6">
      {/* Team Members */}
      <Card>
        <CardHeader className="border-b border-slate-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900">Team Members</h3>
            <Button onClick={onAddMember} size="sm">
              <Plus className="w-4 h-4 mr-1" />
              Add Member
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="p-6">
          {/* US Team */}
          <div className="mb-6">
            <div className="flex items-center space-x-2 mb-3">
              <FlagIcon className="text-blue-600 w-4 h-4" />
              <span className="text-sm font-semibold text-slate-900">US Team ({usMembers.length})</span>
            </div>
            <div className="space-y-2">
              {usMembers.map((member) => (
                <div key={member.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-blue-600">
                        {getInitials(member.name)}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">{member.name}</p>
                      <p className="text-xs text-slate-500">{member.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getStatusBadge(member)}
                    <Button variant="ghost" size="sm" onClick={() => handleEditMember(member)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* UK Team */}
          <div>
            <div className="flex items-center space-x-2 mb-3">
              <FlagIcon className="text-blue-600 w-4 h-4" />
              <span className="text-sm font-semibold text-slate-900">UK Team ({ukMembers.length})</span>
            </div>
            <div className="space-y-2">
              {ukMembers.map((member) => (
                <div key={member.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-blue-600">
                        {getInitials(member.name)}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">{member.name}</p>
                      <p className="text-xs text-slate-500">{member.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getStatusBadge(member)}
                    <Button variant="ghost" size="sm" onClick={() => handleEditMember(member)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader className="border-b border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900">Quick Actions</h3>
        </CardHeader>
        
        <CardContent className="p-6 space-y-3">
          <Button
            variant="outline"
            className={`w-full justify-start h-auto p-3 transition-all duration-300 ${
              autoAssignMutation.isPending ? 'bg-blue-50 border-blue-200' : ''
            }`}
            onClick={() => autoAssignMutation.mutate()}
            disabled={autoAssignMutation.isPending}
          >
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center mr-3 transition-colors ${
              autoAssignMutation.isPending ? 'bg-blue-100' : 'bg-green-100'
            }`}>
              {autoAssignMutation.isPending ? (
                <Loader2 className="text-blue-600 w-5 h-5 animate-spin" />
              ) : (
                <Wand2 className="text-green-600 w-5 h-5" />
              )}
            </div>
            <div className="text-left flex-1">
              <div className="flex items-center space-x-2">
                <p className="text-sm font-medium">
                  {autoAssignMutation.isPending ? "Auto-Assigning..." : "Auto-Assign Next Week"}
                </p>
                {autoAssignMutation.isPending && (
                  <Sparkles className="w-3 h-3 text-blue-500 animate-pulse" />
                )}
              </div>
              <p className="text-xs text-slate-500">
                {loadingStageTeam || "Fair rotation algorithm"}
              </p>
            </div>
          </Button>

          <Button 
            variant="outline" 
            className="w-full justify-start h-auto p-3"
            onClick={() => setShowHolidayModal(true)}
          >
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center mr-3">
              <CalendarX className="text-amber-600 w-5 h-5" />
            </div>
            <div className="text-left">
              <p className="text-sm font-medium">Manage Holidays</p>
              <p className="text-xs text-slate-500">Set unavailable periods</p>
            </div>
          </Button>

          <Button 
            variant="outline" 
            className="w-full justify-start h-auto p-3"
            onClick={() => setShowFairnessModal(true)}
          >
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
              <TrendingUp className="text-blue-600 w-5 h-5" />
            </div>
            <div className="text-left">
              <p className="text-sm font-medium">Fairness Report</p>
              <p className="text-xs text-slate-500">View assignment history</p>
            </div>
          </Button>
        </CardContent>
      </Card>

      {/* Modals */}
      <HolidayManagementModal 
        isOpen={showHolidayModal}
        onClose={() => setShowHolidayModal(false)}
      />
      
      <FairnessReportModal 
        isOpen={showFairnessModal}
        onClose={() => setShowFairnessModal(false)}
      />
      
      <SimpleEditMemberModal
        isOpen={showEditModal}
        onClose={handleCloseEditModal}
        member={selectedMember}
      />
    </div>
  );
}
