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
import { CalendarX, User } from "lucide-react";
import type { TeamMember } from "@shared/schema";

const holidaySchema = z.object({
  memberId: z.number().min(1, "Please select a team member"),
  holidayStart: z.string().min(1, "Start date is required"),
  holidayEnd: z.string().min(1, "End date is required"),
});

type HolidayFormData = z.infer<typeof holidaySchema>;

interface HolidayManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HolidayManagementModal({ isOpen, onClose }: HolidayManagementModalProps) {
  const { toast } = useToast();
  
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
      form.reset();
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
      return apiRequest("PATCH", `/api/team-members/${memberId}`, {
        holidayStart: null,
        holidayEnd: null,
        isAvailable: true,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/team-members"] });
      toast({
        title: "Holiday Cleared",
        description: "Team member is now available",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to clear holiday period",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: HolidayFormData) => {
    updateHolidayMutation.mutate(data);
  };

  const membersOnHoliday = teamMembers.filter(m => !m.isAvailable && m.holidayStart && m.holidayEnd);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <CalendarX className="w-5 h-5" />
            <span>Holiday Management</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Current Holidays */}
          {membersOnHoliday.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-slate-900 mb-3">Current Holidays</h3>
              <div className="space-y-2">
                {membersOnHoliday.map((member) => (
                  <Card key={member.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
                            <User className="w-4 h-4 text-amber-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-900">{member.name}</p>
                            <p className="text-xs text-slate-500">
                              {member.holidayStart} to {member.holidayEnd}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant="secondary" className="bg-amber-100 text-amber-800">
                            On Holiday
                          </Badge>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => clearHolidayMutation.mutate(member.id)}
                            disabled={clearHolidayMutation.isPending}
                          >
                            Clear
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Add Holiday Form */}
          <div>
            <h3 className="text-sm font-medium text-slate-900 mb-3">Set Holiday Period</h3>
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
                          {teamMembers.filter(m => m.isAvailable).map((member) => (
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
                
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="holidayStart"
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
                    name="holidayEnd"
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
                
                <div className="flex space-x-3 pt-4">
                  <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
                    Close
                  </Button>
                  <Button 
                    type="submit" 
                    className="flex-1" 
                    disabled={updateHolidayMutation.isPending}
                  >
                    Set Holiday
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}