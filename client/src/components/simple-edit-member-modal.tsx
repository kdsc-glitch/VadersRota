import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Plus, Trash2 } from "lucide-react";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { insertTeamMemberSchema, type TeamMember } from "@shared/schema";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const editMemberSchema = insertTeamMemberSchema;
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
  const queryClient = useQueryClient();

  const form = useForm<EditMemberFormData>({
    resolver: zodResolver(editMemberSchema),
    defaultValues: {
      name: "",
      email: "",
      region: "us",
      role: "developer",
    },
  });

  useEffect(() => {
    if (member) {
      form.reset({
        name: member.name,
        email: member.email,
        region: member.region,
        role: member.role,
      });

      // Load holiday periods from the holidays API
      const loadHolidayPeriods = async () => {
        try {
          const existingHolidays = await apiRequest("GET", `/api/holidays/member/${member.id}`);
          const holidayPeriodsData = existingHolidays.map((holiday: any) => ({
            id: holiday.id.toString(),
            startDate: new Date(holiday.startDate),
            endDate: new Date(holiday.endDate),
            description: holiday.description || `Holiday ${new Date(holiday.startDate).toLocaleDateString()}`
          }));
          
          setHolidayPeriods(holidayPeriodsData);
        } catch (error) {
          setHolidayPeriods([]);
        }
      };

      loadHolidayPeriods();
    }
  }, [member, form]);

  const updateMemberMutation = useMutation({
    mutationFn: (data: EditMemberFormData) => {
      if (!member) throw new Error("No member selected");
      return apiRequest("PATCH", `/api/team-members/${member.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/team-members"] });
    },
    onError: (error: any) => {
      const errorMessage = error?.message || "Failed to update team member";
      toast({
        title: "Update Failed",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const addHolidayPeriod = () => {
    if (newStartDate && newEndDate) {
      const newHoliday: HolidayPeriod = {
        id: Date.now().toString(),
        startDate: newStartDate,
        endDate: newEndDate,
        description: newDescription || `Holiday ${newStartDate.toLocaleDateString()} - ${newEndDate.toLocaleDateString()}`
      };
      setHolidayPeriods([...holidayPeriods, newHoliday]);
      setNewStartDate(undefined);
      setNewEndDate(undefined);
      setNewDescription("");
    }
  };

  const removeHolidayPeriod = (id: string) => {
    const updatedPeriods = holidayPeriods.filter(period => period.id !== id);
    setHolidayPeriods(updatedPeriods);
  };

  const onSubmit = async (data: EditMemberFormData) => {
    if (!member) return;
    
    try {
      // Helper function to format date without timezone conversion
      const formatDateLocal = (date: Date): string => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };
      
      // Update basic member info
      await updateMemberMutation.mutateAsync(data);

      // Delete existing holidays for this member
      const existingHolidays = await apiRequest("GET", `/api/holidays/member/${member.id}`);
      for (const holiday of existingHolidays) {
        await apiRequest("DELETE", `/api/holidays/${holiday.id}`);
      }

      // Create new holiday periods
      for (const holidayPeriod of holidayPeriods) {
        await apiRequest("POST", "/api/holidays", {
          memberId: member.id,
          startDate: formatDateLocal(holidayPeriod.startDate),
          endDate: formatDateLocal(holidayPeriod.endDate),
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

  if (!member) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Team Member</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
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
                      <Input type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

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
                        <SelectItem value="tech_lead">Tech Lead</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Holiday Periods Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Holiday Periods</h3>
              
              {/* Add new holiday period */}
              <div className="border rounded-lg p-4 space-y-4">
                <h4 className="font-medium">Add Holiday Period</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Start Date</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {newStartDate ? format(newStartDate, "PPP") : "Pick start date"}
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
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">End Date</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {newEndDate ? format(newEndDate, "PPP") : "Pick end date"}
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
                </div>
                
                <div>
                  <label className="text-sm font-medium">Description (optional)</label>
                  <Input
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder="e.g., Annual leave, Christmas holiday"
                  />
                </div>
                
                <Button
                  type="button"
                  onClick={addHolidayPeriod}
                  disabled={!newStartDate || !newEndDate}
                  className="w-full"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Holiday Period
                </Button>
              </div>

              {/* Existing holiday periods */}
              {holidayPeriods.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium">Current Holiday Periods</h4>
                  {holidayPeriods.map((period) => (
                    <div key={period.id} className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                      <div>
                        <p className="font-medium">
                          {format(period.startDate, "MMM d, yyyy")} - {format(period.endDate, "MMM d, yyyy")}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{period.description}</p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeHolidayPeriod(period.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateMemberMutation.isPending}>
                {updateMemberMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}