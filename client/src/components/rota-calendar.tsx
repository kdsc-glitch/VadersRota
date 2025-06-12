import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Plus, Link, FlagIcon, Wand2, Loader2, Sparkles, Users } from "lucide-react";
import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { QuickAssignModal } from "./quick-assign-modal";
import { DayAssignModal } from "./day-assign-modal";
import { apiRequest, queryClient } from "@/lib/queryClient";
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
  const [holidayConflicts, setHolidayConflicts] = useState<Map<string, any>>(new Map());
  const [refreshKey, setRefreshKey] = useState(0);
  
  // Generate calendar dates for the current week (Monday to Friday only)
  const today = new Date();
  const startOfWeek = new Date(today);
  // Start from Monday (day 1) instead of Sunday (day 0)
  const dayOfWeek = today.getDay();
  const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Handle Sunday case
  startOfWeek.setDate(today.getDate() + daysToMonday + (currentWeekOffset * 7));
  
  const weekDates = Array.from({ length: 5 }, (_, i) => {
    const date = new Date(startOfWeek);
    date.setDate(startOfWeek.getDate() + i);
    return date;
  });

  // Get assignments for this week
  const { data: allAssignments = [], refetch: refetchAssignments } = useQuery<RotaAssignment[]>({
    queryKey: ["/api/rota-assignments", refreshKey],
  });

  // Load conflict data for ALL assignments to detect any holiday conflicts
  useEffect(() => {
    let isActive = true;
    
    const loadConflicts = async () => {
      if (allAssignments.length === 0) return;
      
      const conflicts = new Map();
      
      // Check ALL assignments for potential conflicts, not just specific dates
      for (const assignment of allAssignments) {
        if (!isActive) break;
        
        try {
          // Use fetch directly to check each assignment for conflicts
          const response = await fetch('/api/rota-assignments/check-conflicts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: assignment.id,
              startDate: assignment.startDate,
              endDate: assignment.endDate,
              usMemberId: assignment.usMemberId,
              ukMemberId: assignment.ukMemberId
            })
          });
          
          if (response.ok) {
            const result = await response.json();
            
            if (result.hasConflict && result.conflictingMembers?.length > 0) {
              conflicts.set(assignment.startDate, {
                hasConflict: true,
                conflictingMembers: result.conflictingMembers,
                assignment
              });
            }
          }
        } catch (error) {
          console.error(`Failed to check assignment ${assignment.id}:`, error);
        }
      }
      
      if (isActive) {
        setHolidayConflicts(conflicts);
        console.log(`Loaded conflicts for ${conflicts.size} dates out of ${allAssignments.length} total assignments`);
        if (conflicts.size > 0) {
          console.log('Conflicted dates:', Array.from(conflicts.keys()));
        }
      }
    };
    
    loadConflicts();
    
    return () => {
      isActive = false;
    };
  }, [allAssignments.length, refreshKey]);

  // Find assignment that covers this week
  const weekStartStr = startOfWeek.toISOString().split('T')[0];
  const weekEndStr = weekDates[4].toISOString().split('T')[0];
  
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

  const [loadingStage, setLoadingStage] = useState<string>("");
  
  const autoAssignMutation = useMutation({
    mutationFn: async () => {
      const weekStartStr = startOfWeek.toISOString().split('T')[0];
      const weekEndStr = weekDates[4].toISOString().split('T')[0];
      
      // Simulate loading stages for better UX
      setLoadingStage("Analyzing team availability...");
      await new Promise(resolve => setTimeout(resolve, 800));
      
      setLoadingStage("Applying fair rotation algorithm...");
      await new Promise(resolve => setTimeout(resolve, 600));
      
      setLoadingStage("Checking holiday conflicts...");
      await new Promise(resolve => setTimeout(resolve, 400));
      
      setLoadingStage("Finalizing assignments...");
      
      return apiRequest("POST", "/api/rota-assignments/auto-assign", {
        startDate: weekStartStr,
        endDate: weekEndStr,
      });
    },
    onSuccess: (data: any) => {
      setLoadingStage("Assignment complete!");
      setTimeout(() => setLoadingStage(""), 1000);
      
      // Handle assignment success - distinguish between full and partial
      if (data.assignments && data.skippedDays) {
        if (data.skippedDays.length === 0) {
          // Full assignment - all days successfully assigned
          const assignedDays = data.assignments.map((a: any) => 
            `${new Date(a.date).toLocaleDateString()}: ${a.usMembers} (US), ${a.ukMember} (UK)`
          ).join('\n');
          
          alert(`Week Successfully Assigned!\n\nAll ${data.assignments.length} days have been assigned:\n${assignedDays}`);
        } else {
          // Partial assignment - some days were skipped
          const assignedDays = data.assignments.map((a: any) => 
            `${new Date(a.date).toLocaleDateString()}: ${a.usMembers} (US), ${a.ukMember} (UK)`
          ).join('\n');
          
          const skippedDays = data.skippedDays.map((s: any) => 
            `${new Date(s.date).toLocaleDateString()}: ${s.reason}`
          ).join('\n');
          
          alert(`${data.message}\n\nAssigned days:\n${assignedDays}\n\nSkipped days:\n${skippedDays}`);
        }
      }
      
      setRefreshKey(prev => prev + 1);
      queryClient.invalidateQueries({ queryKey: ["/api/rota-assignments/current"] });
      queryClient.invalidateQueries({ queryKey: ["/api/rota-assignments/upcoming"] });
    },
    onError: (error: any) => {
      setLoadingStage("");
      console.error('Auto-assign failed:', error);
      
      // Extract error details from response
      const errorData = error.response?.data || error.data || {};
      console.log('Error details:', errorData);
      
      let alertMessage = "Auto-assignment failed";
      
      if (errorData.message) {
        alertMessage = `Auto-assignment failed: ${errorData.message}`;
        
        if (errorData.period) {
          alertMessage += `\n\nPeriod: ${errorData.period}`;
        }
        
        if (errorData.conflicts && errorData.conflicts.length > 0) {
          alertMessage += `\n\nConflicts:\n${errorData.conflicts.join('\n')}`;
        }
        
        if (errorData.availableUS !== undefined && errorData.availableUK !== undefined) {
          alertMessage += `\n\nAvailable members: US: ${errorData.availableUS}, UK: ${errorData.availableUK}`;
        }
      }
      
      // Show detailed error information
      alert(alertMessage);
    },
  });

  const clearWeekMutation = useMutation({
    mutationFn: async () => {
      const weekStartStr = startOfWeek.toISOString().split('T')[0];
      const weekEndStr = weekDates[weekDates.length - 1].toISOString().split('T')[0];
      
      // Find all assignments that fall within this week
      const weekAssignments = allAssignments.filter(assignment => {
        const assignmentStart = new Date(assignment.startDate);
        const assignmentEnd = new Date(assignment.endDate);
        const weekStart = new Date(weekStartStr);
        const weekEnd = new Date(weekEndStr);
        
        // Check if assignment overlaps with this week
        return assignmentStart <= weekEnd && assignmentEnd >= weekStart;
      });
      
      // Delete all assignments for this week with better error handling
      const results = [];
      for (const assignment of weekAssignments) {
        try {
          await apiRequest("DELETE", `/api/rota-assignments/${assignment.id}`);
          console.log('Successfully deleted assignment:', assignment.id);
          results.push({ id: assignment.id, success: true });
        } catch (error) {
          console.error('Failed to delete assignment:', assignment.id, error);
          // Continue with other deletions instead of throwing
          results.push({ id: assignment.id, success: false, error });
        }
      }
      
      // Check if any deletions succeeded
      const successCount = results.filter(r => r.success).length;
      const failureCount = results.filter(r => !r.success).length;
      
      if (successCount === 0 && failureCount > 0) {
        throw new Error(`Failed to delete any assignments (${failureCount} failed)`);
      }
      
      return { successCount, failureCount, total: weekAssignments.length };
    },
    onSuccess: () => {
      console.log('Clear week completed successfully');
      
      // Force immediate UI refresh by changing the query key
      setRefreshKey(prev => prev + 1);
      
      // Also invalidate other related queries
      queryClient.invalidateQueries({ queryKey: ["/api/rota-assignments/current"] });
      queryClient.invalidateQueries({ queryKey: ["/api/rota-assignments/upcoming"] });
    },
    onError: (error) => {
      console.error('Clear week failed:', error);
    },
  });

  const handleClearWeek = () => {
    if (confirm(`Are you sure you want to clear all assignments for the week of ${startOfWeek.toLocaleDateString()}?`)) {
      clearWeekMutation.mutate();
    }
  };

  const handleDayClick = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    
    // Check for day-specific assignment first
    let dayAssignment = allAssignments.find(assignment => 
      assignment.startDate === dateStr && assignment.endDate === dateStr
    );
    
    // If no day-specific assignment, check for week-level assignment covering this day
    if (!dayAssignment) {
      dayAssignment = allAssignments.find(assignment => 
        dateStr >= assignment.startDate && dateStr <= assignment.endDate &&
        assignment.startDate !== assignment.endDate // Ensure it's a week assignment
      );
    }
    
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

  const getDayAssignment = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    
    // First check for specific day assignment (startDate === endDate)
    const dayAssignment = allAssignments.find(assignment => 
      assignment.startDate === dateStr && assignment.endDate === dateStr
    );
    if (dayAssignment) return dayAssignment;
    
    // Then check if this date falls within a week assignment
    const weekAssignmentForDate = allAssignments.find(assignment => 
      dateStr >= assignment.startDate && 
      dateStr <= assignment.endDate &&
      assignment.startDate !== assignment.endDate // Ensure it's a week assignment
    );
    
    return weekAssignmentForDate || null;
  };

  const getDayUSMember = (date: Date) => {
    const assignment = getDayAssignment(date);
    if (!assignment) return null;
    return teamMembers.find(m => m.id === assignment.usMemberId) || null;
  };

  const getDayUKMember = (date: Date) => {
    const assignment = getDayAssignment(date);
    if (!assignment) return null;
    return teamMembers.find(m => m.id === assignment.ukMemberId) || null;
  };

  const getWeekLabel = () => {
    if (weekDates.length === 0) return "Loading...";
    
    const startDate = weekDates[0];
    const endDate = weekDates[weekDates.length - 1];
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
                <Button 
                  onClick={() => autoAssignMutation.mutate()} 
                  size="sm"
                  disabled={autoAssignMutation.isPending}
                  className={`transition-all duration-300 ${autoAssignMutation.isPending ? 'bg-blue-600 hover:bg-blue-600' : ''}`}
                >
                  {autoAssignMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      <Sparkles className="w-3 h-3 mr-1 animate-pulse" />
                      Auto-Assigning...
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-4 h-4 mr-1" />
                      Auto-Assign Week
                    </>
                  )}
                </Button>
              )}
              {weekAssignment && (
                <Button onClick={handleClearWeek} variant="outline" size="sm">
                  Clear Week
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
        
        <CardContent className="p-6 relative">
          {/* Loading Overlay */}
          {autoAssignMutation.isPending && (
            <div className="absolute inset-0 bg-white/90 backdrop-blur-sm z-10 flex items-center justify-center rounded-lg">
              <div className="text-center space-y-4 p-8">
                <div className="relative">
                  <div className="w-16 h-16 mx-auto bg-blue-100 rounded-full flex items-center justify-center mb-4">
                    <Users className="w-8 h-8 text-blue-600 animate-pulse" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center">
                    <Sparkles className="w-3 h-3 text-white animate-bounce" />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-center space-x-2">
                    <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                    <span className="text-lg font-medium text-gray-800">Auto-Assigning Week</span>
                  </div>
                  {loadingStage && (
                    <div className="text-sm text-gray-600 animate-pulse">
                      {loadingStage}
                    </div>
                  )}
                </div>
                <div className="flex justify-center space-x-1 mt-4">
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            </div>
          )}
          
          {/* Calendar Header */}
          <div className="grid grid-cols-6 gap-4 mb-4">
            <div className="text-sm font-medium text-slate-600">Week</div>
            {weekDates.map((date, index) => (
              <div key={index} className="text-sm font-medium text-slate-600 text-center">
                {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </div>
            ))}
          </div>

          {/* US Region Row */}
          <div className="grid grid-cols-6 gap-4 mb-3">
            <div className="flex items-center space-x-2">
              <FlagIcon className="text-blue-600 w-4 h-4" />
              <span className="text-sm font-medium text-slate-700">US</span>
            </div>
            {weekDates.map((date, index) => {
              const dayUSMember = getDayUSMember(date);
              const isAssigned = !!dayUSMember;
              const dateStr = date.toISOString().split('T')[0];
              const conflict = holidayConflicts.get(dateStr);
              const hasUSConflict = conflict && conflict.hasConflict && conflict.conflictingMembers.some((m: any) => m.region === 'us');
              
              // Debug logging for June 16th conflict
              if (dateStr === '2025-06-16') {
                console.log('June 16th - Conflict data:', conflict);
                console.log('June 16th - Has US conflict:', hasUSConflict);
                console.log('June 16th - US Member:', dayUSMember);
                console.log('June 16th - Assignment for this date:', getDayAssignment(date));
              }
              
              return (
                <div 
                  key={index} 
                  className={`p-2 border rounded-lg text-center cursor-pointer transition-colors ${
                    hasUSConflict
                      ? "bg-red-50 border-red-200 hover:bg-red-100"
                      : isAssigned 
                        ? "bg-green-50 border-green-200 hover:bg-green-100" 
                        : "bg-slate-50 border-slate-200 hover:bg-slate-100"
                  }`}
                  onClick={() => handleDayClick(date)}
                  title={hasUSConflict ? `Holiday conflict: ${conflict.conflictingMembers.filter((m: any) => m.region === 'us').map((m: any) => m.name).join(', ')}` : ''}
                >
                  <div className={`text-xs font-medium ${
                    hasUSConflict ? "text-red-800" : isAssigned ? "text-green-800" : "text-slate-600"
                  }`}>
                    {dayUSMember 
                      ? getNameInitials(dayUSMember.name)
                      : "TBD"
                    }
                  </div>
                  <div className={`text-xs ${
                    hasUSConflict ? "text-red-600" : isAssigned ? "text-green-600" : "text-slate-500"
                  }`}>
                    {hasUSConflict ? "Holiday!" : isAssigned ? "Assigned" : "Click to assign"}
                  </div>
                </div>
              );
            })}
          </div>

          {/* UK Region Row */}
          <div className="grid grid-cols-6 gap-4 mb-3">
            <div className="flex items-center space-x-2">
              <FlagIcon className="text-blue-600 w-4 h-4" />
              <span className="text-sm font-medium text-slate-700">UK</span>
            </div>
            {weekDates.map((date, index) => {
              const dayUKMember = getDayUKMember(date);
              const isAssigned = !!dayUKMember;
              const dateStr = date.toISOString().split('T')[0];
              const conflict = holidayConflicts.get(dateStr);
              const hasUKConflict = conflict && conflict.conflictingMembers.some((m: any) => m.region === 'uk');
              
              return (
                <div 
                  key={index} 
                  className={`p-2 border rounded-lg text-center cursor-pointer transition-colors ${
                    hasUKConflict
                      ? "bg-red-50 border-red-200 hover:bg-red-100"
                      : isAssigned 
                        ? "bg-green-50 border-green-200 hover:bg-green-100" 
                        : "bg-slate-50 border-slate-200 hover:bg-slate-100"
                  }`}
                  onClick={() => handleDayClick(date)}
                  title={hasUKConflict ? `Holiday conflict: ${conflict.conflictingMembers.filter((m: any) => m.region === 'uk').map((m: any) => m.name).join(', ')}` : ''}
                >
                  <div className={`text-xs font-medium ${
                    hasUKConflict ? "text-red-800" : isAssigned ? "text-green-800" : "text-slate-600"
                  }`}>
                    {dayUKMember 
                      ? getNameInitials(dayUKMember.name)
                      : "TBD"
                    }
                  </div>
                  <div className={`text-xs ${
                    hasUKConflict ? "text-red-600" : isAssigned ? "text-green-600" : "text-slate-500"
                  }`}>
                    {hasUKConflict ? "Holiday!" : isAssigned ? "Assigned" : "Click to assign"}
                  </div>
                </div>
              );
            })}
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
