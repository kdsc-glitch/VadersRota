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
import { CalendarX, User, ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import type { TeamMember, Holiday } from "@shared/schema";

const holidaySchema = z.object({
  memberId: z.coerce.number().min(1, "Please select a team member"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  description: z.string().optional(),
}).refine((data) => {
  if (data.startDate && data.endDate) {
    return new Date(data.startDate) <= new Date(data.endDate);
  }
  return true;
}, {
  message: "End date must be after or equal to start date",
  path: ["endDate"],
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
    enabled: isOpen,
  });

  const { data: holidays = [] } = useQuery<Holiday[]>({
    queryKey: ["/api/holidays"],
    enabled: isOpen,
  });

  const form = useForm<HolidayFormData>({
    resolver: zodResolver(holidaySchema),
    defaultValues: {
      memberId: 0,
      startDate: "",
      endDate: "",
      description: "",
    },
  });

  const createHolidayMutation = useMutation({
    mutationFn: async (data: HolidayFormData) => {
      const startDate = new Date(data.startDate);
      const endDate = new Date(data.endDate);
      
      if (startDate > endDate) {
        throw new Error("Start date must be before or equal to end date");
      }

      return apiRequest("POST", "/api/holidays", {
        memberId: data.memberId,
        startDate: data.startDate,
        endDate: data.endDate,
        description: data.description || `Holiday ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/holidays"] });
      queryClient.invalidateQueries({ queryKey: ["/api/team-members"] });
      toast({
        title: "Holiday Added",
        description: "Holiday period has been successfully added",
      });
      form.reset();
      setShowAddForm(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add holiday period",
        variant: "destructive",
      });
    },
  });

  const deleteHolidayMutation = useMutation({
    mutationFn: async (holidayId: number) => {
      return apiRequest("DELETE", `/api/holidays/${holidayId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/holidays"] });
      queryClient.invalidateQueries({ queryKey: ["/api/team-members"] });
      toast({
        title: "Holiday Removed",
        description: "Holiday period has been removed",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to remove holiday period",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: HolidayFormData) => {
    createHolidayMutation.mutate(data);
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  const getMonthName = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  // Get member name by ID
  const getMemberName = (memberId: number) => {
    const member = teamMembers.find(m => m.id === memberId);
    return member ? member.name : "Unknown Member";
  };

  // Get holidays for the current month
  const currentMonthHolidays = holidays.filter(holiday => {
    const holidayStart = new Date(holiday.startDate);
    const holidayEnd = new Date(holiday.endDate);
    const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    
    return (holidayStart <= monthEnd && holidayEnd >= monthStart);
  });

  // Check if a date has holidays
  const getDateHolidays = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return holidays.filter(holiday => {
      const startDate = new Date(holiday.startDate);
      const endDate = new Date(holiday.endDate);
      const checkDate = new Date(dateStr);
      return checkDate >= startDate && checkDate <= endDate;
    });
  };

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
          {/* Add Holiday Form */}
          {showAddForm && (
            <Card>
              <CardContent className="p-4">
                <h3 className="text-sm font-medium text-slate-900 mb-4">Add New Holiday Period</h3>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="memberId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Team Member</FormLabel>
                          <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
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
                        name="startDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Start Date</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="endDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>End Date</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description (Optional)</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="e.g., Annual leave, Conference..."
                              {...field}
                              value={field.value || ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="flex space-x-3 pt-4">
                      <Button 
                        type="button" 
                        variant="outline" 
                        className="flex-1" 
                        onClick={() => setShowAddForm(false)}
                      >
                        Cancel
                      </Button>
                      <Button 
                        type="submit" 
                        className="flex-1" 
                        disabled={createHolidayMutation.isPending}
                      >
                        {createHolidayMutation.isPending ? "Adding..." : "Add Holiday"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          )}

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

          {/* Simple Calendar Grid */}
          <Card>
            <CardContent className="p-6">
              <div className="grid grid-cols-7 gap-2 text-center">
                {/* Header */}
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="p-2 text-sm font-medium text-slate-600">
                    {day}
                  </div>
                ))}
                
                {/* Calendar Days */}
                {(() => {
                  const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
                  const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
                  const startDate = new Date(firstDay);
                  startDate.setDate(startDate.getDate() - firstDay.getDay());
                  
                  const days = [];
                  for (let i = 0; i < 42; i++) {
                    const date = new Date(startDate);
                    date.setDate(startDate.getDate() + i);
                    
                    const isCurrentMonth = date.getMonth() === currentDate.getMonth();
                    const dateHolidays = getDateHolidays(date);
                    const hasHolidays = dateHolidays.length > 0;
                    
                    days.push(
                      <div
                        key={i}
                        className={`p-2 text-sm relative border rounded ${
                          isCurrentMonth 
                            ? hasHolidays 
                              ? 'bg-amber-100 border-amber-300 text-amber-900' 
                              : 'bg-white border-slate-200 text-slate-900'
                            : 'bg-slate-50 border-slate-100 text-slate-400'
                        }`}
                        title={hasHolidays ? dateHolidays.map(h => `${getMemberName(h.memberId)}: ${h.description || 'Holiday'}`).join(', ') : ''}
                      >
                        {date.getDate()}
                        {hasHolidays && (
                          <div className="absolute -top-1 -right-1 w-3 h-3 bg-amber-500 rounded-full flex items-center justify-center">
                            <span className="text-xs text-white font-bold">{dateHolidays.length}</span>
                          </div>
                        )}
                      </div>
                    );
                  }
                  return days;
                })()}
              </div>
            </CardContent>
          </Card>

          {/* Holiday Legend */}
          {currentMonthHolidays.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-slate-900 mb-3">Holiday Periods This Month</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {currentMonthHolidays.map((holiday) => (
                  <Card key={holiday.id} className="bg-amber-50 border-amber-200">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div className="w-6 h-6 bg-amber-100 rounded-full flex items-center justify-center">
                            <User className="w-3 h-3 text-amber-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-900">{getMemberName(holiday.memberId)}</p>
                            <p className="text-xs text-slate-500">
                              {new Date(holiday.startDate).toLocaleDateString()} - {new Date(holiday.endDate).toLocaleDateString()}
                            </p>
                            {holiday.description && (
                              <p className="text-xs text-slate-600 mt-1">{holiday.description}</p>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteHolidayMutation.mutate(holiday.id)}
                          disabled={deleteHolidayMutation.isPending}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {holidays.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center">
                <CalendarX className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900 mb-2">No Holidays Scheduled</h3>
                <p className="text-slate-500 mb-4">Start by adding holiday periods for your team members.</p>
                <Button onClick={() => setShowAddForm(true)} className="flex items-center space-x-2">
                  <Plus className="w-4 h-4" />
                  <span>Add First Holiday</span>
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex justify-end pt-4 border-t border-slate-200">
            <Button onClick={onClose} variant="outline">
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}