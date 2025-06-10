import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Plus, Link, FlagIcon } from "lucide-react";
import type { TeamMember, RotaAssignment } from "@shared/schema";

interface RotaCalendarProps {
  teamMembers: TeamMember[];
  currentAssignment: RotaAssignment | undefined;
  onManualAssign: () => void;
}

export function RotaCalendar({ teamMembers, currentAssignment, onManualAssign }: RotaCalendarProps) {
  // Generate calendar dates for this week
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());
  
  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(startOfWeek);
    date.setDate(startOfWeek.getDate() + i);
    return date;
  });

  const getCurrentUSMember = () => {
    if (!currentAssignment) return null;
    return teamMembers.find(m => m.id === currentAssignment.usMemberId);
  };

  const getCurrentUKMember = () => {
    if (!currentAssignment) return null;
    return teamMembers.find(m => m.id === currentAssignment.ukMemberId);
  };

  const getNameInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('');
  };

  const isCurrentAssignmentActive = (date: Date) => {
    if (!currentAssignment) return false;
    const dateStr = date.toISOString().split('T')[0];
    return dateStr >= currentAssignment.startDate && dateStr <= currentAssignment.endDate;
  };

  return (
    <div className="lg:col-span-2">
      <Card>
        <CardHeader className="border-b border-slate-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Support Rota Schedule</h2>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm">
                <ChevronLeft className="w-4 h-4 mr-1" />
                Previous
              </Button>
              <Button onClick={onManualAssign} size="sm">
                <Plus className="w-4 h-4 mr-1" />
                Manual Assign
              </Button>
              <Button variant="outline" size="sm">
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-6">
          {/* Calendar Header */}
          <div className="grid grid-cols-8 gap-4 mb-4">
            <div className="text-sm font-medium text-slate-600">Week</div>
            {weekDates.map((date, index) => (
              <div key={index} className="text-sm font-medium text-slate-600 text-center">
                {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </div>
            ))}
          </div>

          {/* US Region Row */}
          <div className="grid grid-cols-8 gap-4 mb-3">
            <div className="flex items-center space-x-2">
              <FlagIcon className="text-blue-600 w-4 h-4" />
              <span className="text-sm font-medium text-slate-700">US</span>
            </div>
            {weekDates.map((date, index) => (
              <div key={index} className="p-2 bg-green-50 border border-green-200 rounded-lg text-center">
                <div className="text-xs font-medium text-green-800">
                  {isCurrentAssignmentActive(date) && getCurrentUSMember() 
                    ? getNameInitials(getCurrentUSMember()!.name)
                    : index === 6 ? "Next" : "TBD"
                  }
                </div>
                <div className="text-xs text-green-600">
                  {isCurrentAssignmentActive(date) ? "Active" : index === 6 ? "Scheduled" : "TBD"}
                </div>
              </div>
            ))}
          </div>

          {/* UK Region Row */}
          <div className="grid grid-cols-8 gap-4 mb-3">
            <div className="flex items-center space-x-2">
              <FlagIcon className="text-blue-600 w-4 h-4" />
              <span className="text-sm font-medium text-slate-700">UK</span>
            </div>
            {weekDates.map((date, index) => (
              <div key={index} className="p-2 bg-green-50 border border-green-200 rounded-lg text-center">
                <div className="text-xs font-medium text-green-800">
                  {isCurrentAssignmentActive(date) && getCurrentUKMember() 
                    ? getNameInitials(getCurrentUKMember()!.name)
                    : index === 6 ? "Next" : "TBD"
                  }
                </div>
                <div className="text-xs text-green-600">
                  {isCurrentAssignmentActive(date) ? "Active" : index === 6 ? "Scheduled" : "TBD"}
                </div>
              </div>
            ))}
          </div>

          {/* DSG Main Rota Indicator */}
          <div className="mt-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Link className="text-purple-600 w-4 h-4" />
                <span className="text-sm font-medium text-purple-800">DSG Main Rota Sync</span>
              </div>
              <span className="text-xs text-purple-600">Auto-updating</span>
            </div>
            <p className="text-xs text-purple-700 mt-1">
              Team assignments automatically follow main DSG rotation when members are selected
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
