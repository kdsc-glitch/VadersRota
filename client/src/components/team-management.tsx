import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Plus, FlagIcon, Edit, Wand2, CalendarX, FolderSync, TrendingUp } from "lucide-react";
import { useState } from "react";
import { HolidayManagementModal } from "./holiday-management-modal";
import { XMattersSyncModal } from "./xmatters-sync-modal";
import { FairnessReportModal } from "./fairness-report-modal";
import { EditMemberModal } from "./edit-member-modal";
import type { TeamMember } from "@shared/schema";

interface TeamManagementProps {
  teamMembers: TeamMember[];
  onAddMember: () => void;
}

export function TeamManagement({ teamMembers, onAddMember }: TeamManagementProps) {
  const { toast } = useToast();
  const [showHolidayModal, setShowHolidayModal] = useState(false);
  const [showXMattersModal, setShowXMattersModal] = useState(false);
  const [showFairnessModal, setShowFairnessModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);

  const autoAssignMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/rota-assignments/auto-assign"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rota-assignments"] });
      toast({
        title: "Auto-Assignment Complete",
        description: "Next week's support rotation has been automatically assigned",
      });
    },
    onError: () => {
      toast({
        title: "Auto-Assignment Failed",
        description: "Failed to auto-assign next week's rotation",
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
    if (member.isDsgMember) {
      return (
        <Badge variant="secondary" className="bg-purple-100 text-purple-800">
          DSG Main
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
            className="w-full justify-start h-auto p-3"
            onClick={() => autoAssignMutation.mutate()}
            disabled={autoAssignMutation.isPending}
          >
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-3">
              <Wand2 className="text-green-600 w-5 h-5" />
            </div>
            <div className="text-left">
              <p className="text-sm font-medium">Auto-Assign Next Week</p>
              <p className="text-xs text-slate-500">Fair rotation algorithm</p>
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
            onClick={() => setShowXMattersModal(true)}
          >
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
              <FolderSync className="text-purple-600 w-5 h-5" />
            </div>
            <div className="text-left">
              <p className="text-sm font-medium">Sync xMatters DSG Rota</p>
              <p className="text-xs text-slate-500">Update main group assignments</p>
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
      
      <XMattersSyncModal 
        isOpen={showXMattersModal}
        onClose={() => setShowXMattersModal(false)}
      />
      
      <FairnessReportModal 
        isOpen={showFairnessModal}
        onClose={() => setShowFairnessModal(false)}
      />
      
      <EditMemberModal
        isOpen={showEditModal}
        onClose={handleCloseEditModal}
        member={selectedMember}
      />
    </div>
  );
}
