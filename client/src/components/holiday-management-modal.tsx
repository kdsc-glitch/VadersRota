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
import { CalendarX, User, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import type { TeamMember, Holiday } from "@shared/schema";

const holidaySchema = z.object({
  memberId: z.number().min(1, "Please select a team member"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  description: z.string().optional(),
});

type HolidayFormData = z.infer<typeof holidaySchema>;

interface HolidayManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HolidayManagementModal({ isOpen, onClose }: HolidayManagementModalProps) {
  const { toast } = useToast();
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

  // Get member name by ID
  const getMemberName = (memberId: number) => {
    const member = teamMembers.find(m => m.id === memberId);
    return member ? member.name : "Unknown Member";
  };

  // Format date without timezone offset issues
  const formatDateDisplay = (dateString: string) => {
    // Simply reformat the YYYY-MM-DD string to a readable format
    const [year, month, day] = dateString.split('-');
    return `${month}/${day}/${year}`;
  };

  // Filter current and upcoming holidays using string comparison to avoid timezone issues
  const today = new Date();
  const todayString = today.toISOString().split('T')[0]; // YYYY-MM-DD format
  
  const currentHolidays = holidays.filter(holiday => {
    return holiday.startDate <= todayString && holiday.endDate >= todayString;
  });

  const upcomingHolidays = holidays.filter(holiday => {
    return holiday.startDate > todayString;
  });

  const pastHolidays = holidays.filter(holiday => {
    return holiday.endDate < todayString;
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CalendarX className="w-5 h-5" />
              <span>Holiday Management</span>
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

          {/* Current Holidays */}
          {currentHolidays.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-slate-900 mb-3 flex items-center space-x-2">
                <span>Current Holidays</span>
                <Badge variant="secondary">{currentHolidays.length}</Badge>
              </h3>
              <div className="space-y-2">
                {currentHolidays.map((holiday) => (
                  <Card key={holiday.id} className="bg-amber-50 border-amber-200">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
                            <User className="w-4 h-4 text-amber-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-900">{getMemberName(holiday.memberId)}</p>
                            <p className="text-xs text-slate-500">
                              {formatDateDisplay(holiday.startDate)} - {formatDateDisplay(holiday.endDate)}
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

          {/* Upcoming Holidays */}
          {upcomingHolidays.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-slate-900 mb-3 flex items-center space-x-2">
                <span>Upcoming Holidays</span>
                <Badge variant="outline">{upcomingHolidays.length}</Badge>
              </h3>
              <div className="space-y-2">
                {upcomingHolidays.map((holiday) => (
                  <Card key={holiday.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <User className="w-4 h-4 text-blue-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-900">{getMemberName(holiday.memberId)}</p>
                            <p className="text-xs text-slate-500">
                              {formatDateDisplay(holiday.startDate)} - {formatDateDisplay(holiday.endDate)}
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

          {/* Past Holidays (last 10) */}
          {pastHolidays.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-slate-900 mb-3 flex items-center space-x-2">
                <span>Recent Past Holidays</span>
                <Badge variant="secondary">{Math.min(pastHolidays.length, 10)}</Badge>
              </h3>
              <div className="space-y-2">
                {pastHolidays.slice(-10).reverse().map((holiday) => (
                  <Card key={holiday.id} className="bg-slate-50">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center">
                            <User className="w-4 h-4 text-slate-600" />
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