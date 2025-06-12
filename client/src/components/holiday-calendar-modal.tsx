import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { CalendarX, User, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useState } from "react";
import type { TeamMember } from "@shared/schema";

const holidaySchema = z.object({
  memberId: z.number().min(1, "Please select a team member"),
  holidayStart: z.string().min(1, "Start date is required"),
  holidayEnd: z.string().min(1, "End date is required"),
}).refine((data) => {
  if (data.holidayStart && data.holidayEnd) {
    return new Date(data.holidayStart) <= new Date(data.holidayEnd);
  }
  return true;
}, {
  message: "End date must be after or equal to start date",
  path: ["holidayEnd"],
});

type HolidayFormData = z.infer<typeof holidaySchema>;

interface HolidayCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HolidayCalendarModal({ isOpen, onClose }: HolidayCalendarModalProps) {
  const { toast } = useToast();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showAddForm, setShowAddForm] = useState(false);
  
  const { data: teamMembers = [] } = useQuery<TeamMember[]>({
    queryKey: ["/api/team-members"],
  });

  const form = useForm<HolidayFormData>({
    resolver: zodResolver(holidaySchema),
    defaultValues: {
      memberId: 0,
      holidayStart: "",
      holidayEnd: "",
    },
  });

  const updateHolidayMutation = useMutation({
    mutationFn: async (data: HolidayFormData) => {
      return apiRequest("PATCH", `/api/team-members/${data.memberId}`, {
        holidayStart: data.holidayStart,
        holidayEnd: data.holidayEnd,
        isAvailable: false,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/team-members"] });
      toast({
        title: "Holiday Updated",
        description: "Team member holiday period has been set",
      });
      form.reset({
        memberId: 0,
        holidayStart: "",
        holidayEnd: "",
      });
      setShowAddForm(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update holiday period",
        variant: "destructive",
      });
    },
  });

  const clearHolidayMutation = useMutation({
    mutationFn: async (memberId: number) => {
      console.log('Clearing holiday for member:', memberId);
      return apiRequest("PATCH", `/api/team-members/${memberId}`, {
        holidayStart: null,
        holidayEnd: null,
        isAvailable: true,
      });
    },
    onSuccess: () => {
      console.log('Holiday cleared successfully');
      queryClient.invalidateQueries({ queryKey: ["/api/team-members"] });
      toast({
        title: "Holiday Cleared",
        description: "Team member is now available",
      });
    },
    onError: (error: any) => {
      console.error('Error clearing holiday:', error);
      const errorMessage = error?.response?.data?.message || error?.message || "Failed to clear holiday period";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  // Helper function to format date for HTML date input (YYYY-MM-DD)
  const formatDateForInput = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const onSubmit = (data: HolidayFormData) => {
    console.log('Submitting holiday data:', data);
    updateHolidayMutation.mutate(data);
  };

  // Calendar helper functions
  const getMonthName = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const getCalendarDays = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay()); // Start from Sunday
    
    const days = [];
    const current = new Date(startDate);
    
    // Generate 6 weeks (42 days) to cover all possible calendar layouts
    for (let i = 0; i < 42; i++) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    
    return days;
  };

  const isDateInHoliday = (date: Date, member: TeamMember) => {
    if (!member.holidayStart || !member.holidayEnd) return false;
    
    const holidayStart = new Date(member.holidayStart);
    const holidayEnd = new Date(member.holidayEnd);
    
    return date >= holidayStart && date <= holidayEnd;
  };

  const getMembersOnHolidayForDate = (date: Date) => {
    return teamMembers.filter(member => isDateInHoliday(date, member));
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };

  const calendarDays = getCalendarDays(currentDate);
  const membersOnHoliday = teamMembers.filter(m => !m.isAvailable && m.holidayStart && m.holidayEnd);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CalendarX className="w-5 h-5" />
              <span>Holiday Overview</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center space-x-1"
            >
              <Plus className="w-4 h-4" />
              <span>Add Holiday</span>
            </Button>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Month Navigation */}
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateMonth('prev')}
              className="flex items-center space-x-1"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Previous</span>
            </Button>
            
            <h2 className="text-lg font-semibold text-slate-900">
              {getMonthName(currentDate)}
            </h2>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateMonth('next')}
              className="flex items-center space-x-1"
            >
              <span>Next</span>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          {/* Calendar Grid */}
          <div className="border rounded-lg overflow-hidden">
            {/* Day Headers */}
            <div className="grid grid-cols-7 bg-slate-50">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div key={day} className="p-2 text-center text-sm font-medium text-slate-600 border-r border-slate-200 last:border-r-0">
                  {day}
                </div>
              ))}
            </div>
            
            {/* Calendar Days */}
            <div className="grid grid-cols-7">
              {calendarDays.map((day, index) => {
                const isCurrentMonth = day.getMonth() === currentDate.getMonth();
                const membersOnDay = getMembersOnHolidayForDate(day);
                const isToday = day.toDateString() === new Date().toDateString();
                
                return (
                  <div
                    key={index}
                    className={`min-h-20 p-2 border-r border-b border-slate-200 last:border-r-0 ${
                      !isCurrentMonth ? 'bg-slate-50' : 'bg-white'
                    } ${isToday ? 'bg-blue-50 border-blue-200' : ''}`}
                  >
                    <div className={`text-sm font-medium mb-1 ${
                      !isCurrentMonth ? 'text-slate-400' : isToday ? 'text-blue-600' : 'text-slate-900'
                    }`}>
                      {day.getDate()}
                    </div>
                    
                    {/* Holiday indicators for this day */}
                    <div className="space-y-1">
                      {membersOnDay.map((member) => (
                        <div
                          key={member.id}
                          className="text-xs px-1 py-0.5 rounded bg-amber-100 text-amber-800 truncate"
                          title={`${member.name} on holiday`}
                        >
                          {member.name.split(' ')[0]} ({member.region.toUpperCase()})
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Holiday Legend */}
          {membersOnHoliday.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-slate-900 mb-3">Current Holiday Periods</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {membersOnHoliday.map((member) => (
                  <Card key={member.id} className="bg-amber-50 border-amber-200">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div className="w-6 h-6 bg-amber-100 rounded-full flex items-center justify-center">
                            <User className="w-3 h-3 text-amber-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-900">{member.name}</p>
                            <p className="text-xs text-slate-500">
                              {new Date(member.holidayStart!).toLocaleDateString()} - {new Date(member.holidayEnd!).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => clearHolidayMutation.mutate(member.id)}
                          disabled={clearHolidayMutation.isPending}
                          className="text-xs"
                        >
                          Clear
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
          
          {/* Add Holiday Button */}
          {!showAddForm && (
            <div className="text-center">
              <Button
                onClick={() => setShowAddForm(true)}
                className="w-full"
                variant="outline"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add New Holiday Period
              </Button>
            </div>
          )}
          
          {/* Add Holiday Form - Collapsible */}
          {showAddForm && (
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="p-4">
                <h3 className="text-sm font-medium text-slate-900 mb-3">Set New Holiday Period</h3>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="memberId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Team Member</FormLabel>
                          <Select onValueChange={(value) => field.onChange(parseInt(value))}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select team member" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {teamMembers.map((member) => (
                                <SelectItem key={member.id} value={member.id.toString()}>
                                  {member.name} ({member.region.toUpperCase()})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="holidayStart"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Start Date</FormLabel>
                            <FormControl>
                              <Input 
                                type="date" 
                                {...field}
                                min={formatDateForInput(new Date())}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="holidayEnd"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>End Date</FormLabel>
                            <FormControl>
                              <Input 
                                type="date" 
                                {...field}
                                min={form.watch("holidayStart") || formatDateForInput(new Date())}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div className="flex space-x-2">
                      <Button
                        type="submit"
                        disabled={updateHolidayMutation.isPending}
                        className="flex-1"
                      >
                        {updateHolidayMutation.isPending ? "Setting Holiday..." : "Set Holiday Period"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowAddForm(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}