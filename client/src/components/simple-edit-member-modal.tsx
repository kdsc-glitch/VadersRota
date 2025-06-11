import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Plus, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { insertTeamMemberSchema, type TeamMember } from "@shared/schema";
import { z } from "zod";

const editMemberSchema = insertTeamMemberSchema.extend({
  holidayStart: z.string().optional(),
  holidayEnd: z.string().optional(),
});

type EditMemberFormData = z.infer<typeof editMemberSchema>;

interface HolidayPeriod {
  id: string;
  startDate: Date;
  endDate: Date;
  description: string;
}

interface SimpleEditMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: TeamMember | null;
}

export function SimpleEditMemberModal({ isOpen, onClose, member }: SimpleEditMemberModalProps) {
  const { toast } = useToast();
  const [holidayPeriods, setHolidayPeriods] = useState<HolidayPeriod[]>([]);
  const [newStartDate, setNewStartDate] = useState<Date>();
  const [newEndDate, setNewEndDate] = useState<Date>();
  const [newDescription, setNewDescription] = useState("");

  const form = useForm<EditMemberFormData>({
    resolver: zodResolver(editMemberSchema),
    defaultValues: {
      name: "",
      email: "",
      region: "us",
      role: "developer",
      isAvailable: true,
    },
  });

  useEffect(() => {
    if (member) {
      form.reset({
        name: member.name,
        email: member.email,
        region: member.region,
        role: member.role,
        isAvailable: member.isAvailable,
        holidayStart: member.holidayStart || undefined,
        holidayEnd: member.holidayEnd || undefined,
      });

      // Load existing holiday periods from database
      const loadHolidayPeriods = async () => {
        try {
          const existingHolidays = await apiRequest("GET", `/api/holidays/member/${member.id}`);
          const holidayPeriodsData = existingHolidays.map((holiday: any) => ({
            id: holiday.id.toString(),
            startDate: new Date(holiday.startDate),
            endDate: new Date(holiday.endDate),
            description: holiday.description || `Holiday ${new Date(holiday.startDate).toLocaleDateString()}`
          }));
          
          // If no holidays in database but legacy holiday fields exist, use those
          if (holidayPeriodsData.length === 0 && member.holidayStart && member.holidayEnd) {
            setHolidayPeriods([{
              id: "legacy",
              startDate: new Date(member.holidayStart),
              endDate: new Date(member.holidayEnd),
              description: "Existing Holiday"
            }]);
          } else {
            setHolidayPeriods(holidayPeriodsData);
          }
        } catch (error) {
          // Fallback to legacy holiday fields if API fails
          if (member.holidayStart && member.holidayEnd) {
            setHolidayPeriods([{
              id: "legacy",
              startDate: new Date(member.holidayStart),
              endDate: new Date(member.holidayEnd),
              description: "Existing Holiday"
            }]);
          } else {
            setHolidayPeriods([]);
          }
        }
      };

      loadHolidayPeriods();
    }
  }, [member, form]);

  const updateMemberMutation = useMutation({
    mutationFn: (data: EditMemberFormData) => {
      if (!member) throw new Error("No member selected");
      return apiRequest("PUT", `/api/team-members/${member.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/team-members"] });
      toast({
        title: "Member Updated",
        description: "Team member has been successfully updated",
      });
      onClose();
    },
    onError: () => {
      toast({
        title: "Update Failed",
        description: "Failed to update team member",
        variant: "destructive",
      });
    },
  });

  const deleteMemberMutation = useMutation({
    mutationFn: () => {
      if (!member) throw new Error("No member selected");
      return apiRequest("DELETE", `/api/team-members/${member.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/team-members"] });
      toast({
        title: "Member Deleted",
        description: "Team member has been successfully removed",
      });
      onClose();
    },
    onError: () => {
      toast({
        title: "Delete Failed",
        description: "Failed to delete team member",
        variant: "destructive",
      });
    },
  });

  const addHolidayPeriod = () => {
    if (newStartDate && newEndDate) {
      if (newStartDate > newEndDate) {
        toast({
          title: "Invalid Date Range",
          description: "Start date must be before or equal to end date",
          variant: "destructive",
        });
        return;
      }

      const newHoliday: HolidayPeriod = {
        id: Date.now().toString(),
        startDate: newStartDate,
        endDate: newEndDate,
        description: newDescription || `Holiday ${format(newStartDate, "MMM dd")} - ${format(newEndDate, "MMM dd")}`
      };

      setHolidayPeriods([...holidayPeriods, newHoliday]);
      
      // Reset form
      setNewStartDate(undefined);
      setNewEndDate(undefined);
      setNewDescription("");
    } else {
      toast({
        title: "Missing Dates",
        description: "Please select both start and end dates",
        variant: "destructive",
      });
    }
  };

  const removeHolidayPeriod = (id: string) => {
    setHolidayPeriods(holidayPeriods.filter(h => h.id !== id));
  };

  const onSubmit = async (data: EditMemberFormData) => {
    if (!member) return;
    
    try {
      // Update basic member info
      let formData = { ...data };
      
      if (holidayPeriods.length > 0) {
        const firstHoliday = holidayPeriods[0];
        formData.holidayStart = firstHoliday.startDate.toISOString().split('T')[0];
        formData.holidayEnd = firstHoliday.endDate.toISOString().split('T')[0];
      } else {
        formData.holidayStart = undefined;
        formData.holidayEnd = undefined;
      }

      // Save member info first
      await updateMemberMutation.mutateAsync(formData);

      // Delete existing holidays for this member
      const existingHolidays = await apiRequest("GET", `/api/holidays/member/${member.id}`);
      for (const holiday of existingHolidays) {
        await apiRequest("DELETE", `/api/holidays/${holiday.id}`);
      }

      // Create new holiday periods
      for (const holidayPeriod of holidayPeriods) {
        await apiRequest("POST", "/api/holidays", {
          memberId: member.id,
          startDate: holidayPeriod.startDate.toISOString().split('T')[0],
          endDate: holidayPeriod.endDate.toISOString().split('T')[0],
          description: holidayPeriod.description || null
        });
      }

      toast({
        title: "Member Updated",
        description: `Successfully saved ${holidayPeriods.length} holiday periods for ${member.name}.`,
      });

      onClose();
    } catch (error) {
      toast({
        title: "Update Failed",
        description: "Failed to update team member and holiday periods",
        variant: "destructive",
      });
    }
  };

  const handleDelete = () => {
    if (confirm(`Are you sure you want to delete ${member?.name}? This action cannot be undone.`)) {
      deleteMemberMutation.mutate();
    }
  };

  if (!member) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Team Member</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter member name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="Enter email address" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="region"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Region</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select region" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="us">US</SelectItem>
                        <SelectItem value="uk">UK</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="developer">Developer</SelectItem>
                        <SelectItem value="senior_developer">Senior Developer</SelectItem>
                        <SelectItem value="team_lead">Team Lead</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="isAvailable"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Available</FormLabel>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />


            </div>

            {/* Holiday Periods Management */}
            <div className="space-y-4">
              <Label className="text-sm font-medium">Holiday Periods</Label>
              
              {/* Existing holidays */}
              {holidayPeriods.length > 0 && (
                <div className="space-y-2">
                  {holidayPeriods.map((holiday) => (
                    <div key={holiday.id} className="flex items-center space-x-2 p-2 border rounded-lg">
                      <div className="flex-1">
                        <div className="text-sm font-medium">
                          {format(holiday.startDate, "MMM dd, yyyy")} - {format(holiday.endDate, "MMM dd, yyyy")}
                        </div>
                        <div className="text-xs text-muted-foreground">{holiday.description}</div>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeHolidayPeriod(holiday.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add new holiday form */}
              <div className="border rounded-lg p-3 space-y-3">
                <div className="text-sm font-medium">Add Holiday Period</div>
                
                <div className="grid grid-cols-2 gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className={cn(
                          "justify-start text-left font-normal",
                          !newStartDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {newStartDate ? format(newStartDate, "MMM dd") : "Start date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={newStartDate}
                        onSelect={setNewStartDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>

                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className={cn(
                          "justify-start text-left font-normal",
                          !newEndDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {newEndDate ? format(newEndDate, "MMM dd") : "End date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={newEndDate}
                        onSelect={setNewEndDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <Input
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Holiday description (optional)"
                />

                <Button type="button" onClick={addHolidayPeriod} size="sm" className="w-full">
                  <Plus className="w-4 h-4 mr-1" />
                  Add Holiday Period
                </Button>
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                disabled={deleteMemberMutation.isPending}
              >
                Delete Member
              </Button>
              
              <div className="space-x-2">
                <Button type="button" variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateMemberMutation.isPending}>
                  {updateMemberMutation.isPending ? "Updating..." : "Update Member"}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}