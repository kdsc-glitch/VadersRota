import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { insertTeamMemberSchema, type TeamMember } from "@shared/schema";
import { HolidayPeriodsManager } from "./holiday-periods-manager";
import { z } from "zod";

const editMemberSchema = insertTeamMemberSchema.omit({
  holidayStart: true,
  holidayEnd: true,
});

type EditMemberFormData = z.infer<typeof editMemberSchema>;

interface HolidayPeriod {
  id?: number;
  startDate: Date;
  endDate: Date;
  description?: string;
}

interface EditMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: TeamMember | null;
}

export function EditMemberModal({ isOpen, onClose, member }: EditMemberModalProps) {
  const { toast } = useToast();
  const [holidayPeriods, setHolidayPeriods] = useState<HolidayPeriod[]>([]);
  const [newHolidayStart, setNewHolidayStart] = useState<Date>();
  const [newHolidayEnd, setNewHolidayEnd] = useState<Date>();
  const [newHolidayDescription, setNewHolidayDescription] = useState("");

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

  // Update form when member changes
  useEffect(() => {
    if (member) {
      form.reset({
        name: member.name,
        email: member.email,
        region: member.region,
        role: member.role,
        isAvailable: member.isAvailable,
      });

      // Convert existing holiday to new format if present
      if (member.holidayStart && member.holidayEnd) {
        setHolidayPeriods([{
          startDate: new Date(member.holidayStart),
          endDate: new Date(member.holidayEnd),
          description: "Holiday Period"
        }]);
      } else {
        setHolidayPeriods([]);
      }
    }
  }, [member, form]);

  const updateMemberMutation = useMutation({
    mutationFn: (data: EditMemberFormData) => {
      if (!member) throw new Error("No member selected");
      console.log('Updating member with data:', data);
      return apiRequest("PATCH", `/api/team-members/${member.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/team-members"] });
      toast({
        title: "Member Updated",
        description: "Team member has been successfully updated",
      });
      onClose();
    },
    onError: (error: any) => {
      console.error('Update member error:', error);
      const errorMessage = error?.message || "Failed to update team member";
      toast({
        title: "Update Failed",
        description: errorMessage,
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

  const onSubmit = (data: EditMemberFormData) => {
    const formData = {
      ...data,
      holidayStart: holidayStartDate?.toISOString().split('T')[0] || undefined,
      holidayEnd: holidayEndDate?.toISOString().split('T')[0] || undefined,
    };
    updateMemberMutation.mutate(formData);
  };

  const handleDelete = () => {
    if (confirm(`Are you sure you want to delete ${member?.name}? This action cannot be undone.`)) {
      deleteMemberMutation.mutate();
    }
  };

  if (!member) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
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
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
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

            {/* Holiday Period */}
            <div className="space-y-2">
              <Label>Holiday Period (Optional)</Label>
              <div className="grid grid-cols-2 gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "justify-start text-left font-normal",
                        !holidayStartDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {holidayStartDate ? format(holidayStartDate, "MMM dd") : "Start date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={holidayStartDate}
                      onSelect={setHolidayStartDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "justify-start text-left font-normal",
                        !holidayEndDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {holidayEndDate ? format(holidayEndDate, "MMM dd") : "End date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={holidayEndDate}
                      onSelect={setHolidayEndDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              {holidayStartDate || holidayEndDate ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setHolidayStartDate(undefined);
                    setHolidayEndDate(undefined);
                  }}
                >
                  Clear Holiday
                </Button>
              ) : null}
            </div>

            <div className="flex justify-between">
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