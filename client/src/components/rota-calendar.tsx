import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Plus, Link, FlagIcon, Wand2 } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { QuickAssignModal } from "./quick-assign-modal";
import { DayAssignModal } from "./day-assign-modal";
import type { TeamMember, RotaAssignment } from "@shared/schema";

interface RotaCalendarProps {
  teamMembers: TeamMember[];
  currentAssignment: RotaAssignment | undefined;
  onManualAssign: () => void;
}

export function RotaCalendar({ teamMembers, currentAssignment, onManualAssign }: RotaCalendarProps) {
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0);
  const [showQuickAssignModal, setShowQuickAssignModal] = useState(false);
  const [showDayAssignModal, setShowDayAssignModal] = useState(false);
  const [selectedWeekAssignment, setSelectedWeekAssignment] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedDayAssignment, setSelectedDayAssignment] = useState<any>(null);
  
  // Generate calendar dates for the current week (with offset)
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay() + (currentWeekOffset * 7));
  
  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(startOfWeek);
    date.setDate(startOfWeek.getDate() + i);
    return date;
  });

  // Get assignments for this week
  const { data: allAssignments = [] } = useQuery<RotaAssignment[]>({
    queryKey: ["/api/rota-assignments"],
  });

  // Find assignment that covers this week
  const weekStartStr = startOfWeek.toISOString().split('T')[0];
  const weekEndStr = weekDates[6].toISOString().split('T')[0];
  
  const weekAssignment = allAssignments.find(assignment => {
    return assignment.startDate <= weekEndStr && assignment.endDate >= weekStartStr;
  });

  const getWeekUSMember = () => {
    if (!weekAssignment) return null;
    return teamMembers.find(m => m.id === weekAssignment.usMemberId);
  };

  const getWeekUKMember = () => {
    if (!weekAssignment) return null;
    return teamMembers.find(m => m.id === weekAssignment.ukMemberId);
  };

  const navigateToPreviousWeek = () => {
    setCurrentWeekOffset(currentWeekOffset - 1);
  };

  const navigateToNextWeek = () => {
    setCurrentWeekOffset(currentWeekOffset + 1);
  };

  const navigateToCurrentWeek = () => {
    setCurrentWeekOffset(0);
  };

  const handleWeekClick = () => {
    setSelectedWeekAssignment(weekAssignment);
    setShowQuickAssignModal(true);
  };

  const handleDayClick = (date: Date) => {
    // Check if there's a specific assignment for this day
    const dateStr = date.toISOString().split('T')[0];
    const dayAssignment = allAssignments.find(assignment => 
      assignment.startDate === dateStr && assignment.endDate === dateStr
    );
    
    setSelectedDate(dateStr);
    setSelectedDayAssignment(dayAssignment || null);
    setShowDayAssignModal(true);
  };

  const getNameInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('');
  };

  const isWeekAssignmentActive = (date: Date) => {
    if (!weekAssignment) return false;
    const dateStr = date.toISOString().split('T')[0];
    return dateStr >= weekAssignment.startDate && dateStr <= weekAssignment.endDate;
  };

  const getWeekLabel = () => {
    const startDate = weekDates[0];
    const endDate = weekDates[6];
    const startMonth = startDate.toLocaleDateString('en-US', { month: 'short' });
    const endMonth = endDate.toLocaleDateString('en-US', { month: 'short' });
    
    if (currentWeekOffset === 0) {
      return "This Week";
    } else if (currentWeekOffset === 1) {
      return "Next Week";
    } else if (currentWeekOffset === -1) {
      return "Last Week";
    } else {
      return `${startMonth} ${startDate.getDate()} - ${endMonth} ${endDate.getDate()}`;
    }
  };

  return (
    <div className="lg:col-span-2">
      <Card>
        <CardHeader className="border-b border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Support Rota Schedule</h2>
              <p className="text-sm text-slate-500">{getWeekLabel()}</p>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" onClick={navigateToPreviousWeek}>
                <ChevronLeft className="w-4 h-4 mr-1" />
                Previous
              </Button>
              {currentWeekOffset !== 0 && (
                <Button variant="outline" size="sm" onClick={navigateToCurrentWeek}>
                  Today
                </Button>
              )}
              {!weekAssignment && (
                <Button onClick={handleWeekClick} size="sm">
                  <Wand2 className="w-4 h-4 mr-1" />
                  Auto-Assign Week
                </Button>
              )}
              <Button onClick={onManualAssign} size="sm">
                <Plus className="w-4 h-4 mr-1" />
                Manual Assign
              </Button>
              <Button variant="outline" size="sm" onClick={navigateToNextWeek}>
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
              <div 
                key={index} 
                className={`p-2 border rounded-lg text-center cursor-pointer transition-colors ${
                  weekAssignment 
                    ? "bg-green-50 border-green-200 hover:bg-green-100" 
                    : "bg-slate-50 border-slate-200 hover:bg-slate-100"
                }`}
                onClick={() => handleDayClick(date)}
              >
                <div className={`text-xs font-medium ${
                  weekAssignment ? "text-green-800" : "text-slate-600"
                }`}>
                  {weekAssignment && getWeekUSMember() 
                    ? getNameInitials(getWeekUSMember()!.name)
                    : "TBD"
                  }
                </div>
                <div className={`text-xs ${
                  weekAssignment ? "text-green-600" : "text-slate-500"
                }`}>
                  {weekAssignment ? "Assigned" : "Click to assign"}
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
              <div 
                key={index} 
                className={`p-2 border rounded-lg text-center cursor-pointer transition-colors ${
                  weekAssignment 
                    ? "bg-green-50 border-green-200 hover:bg-green-100" 
                    : "bg-slate-50 border-slate-200 hover:bg-slate-100"
                }`}
                onClick={() => handleDayClick(date)}
              >
                <div className={`text-xs font-medium ${
                  weekAssignment ? "text-green-800" : "text-slate-600"
                }`}>
                  {weekAssignment && getWeekUKMember() 
                    ? getNameInitials(getWeekUKMember()!.name)
                    : "TBD"
                  }
                </div>
                <div className={`text-xs ${
                  weekAssignment ? "text-green-600" : "text-slate-500"
                }`}>
                  {weekAssignment ? "Assigned" : "Click to assign"}
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

      {/* Quick Assign Modal */}
      <QuickAssignModal
        isOpen={showQuickAssignModal}
        onClose={() => setShowQuickAssignModal(false)}
        teamMembers={teamMembers}
        weekStartDate={weekStartStr}
        weekEndDate={weekEndStr}
        existingAssignment={selectedWeekAssignment}
      />

      <DayAssignModal
        isOpen={showDayAssignModal}
        onClose={() => setShowDayAssignModal(false)}
        teamMembers={teamMembers}
        selectedDate={selectedDate}
        existingAssignment={selectedDayAssignment}
      />
    </div>
  );
}
