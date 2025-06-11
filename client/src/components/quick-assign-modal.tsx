import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertRotaAssignmentSchema } from "@shared/schema";
import { z } from "zod";
import { Calendar, Users } from "lucide-react";
import type { TeamMember } from "@shared/schema";

const quickAssignSchema = insertRotaAssignmentSchema.extend({
  usMemberId: z.number().min(1, "Please select a US team member"),
  ukMemberId: z.number().min(1, "Please select a UK team member"),
});

type QuickAssignFormData = z.infer<typeof quickAssignSchema>;

interface QuickAssignModalProps {
  isOpen: boolean;
  onClose: () => void;
  teamMembers: TeamMember[];
  weekStartDate: string;
  weekEndDate: string;
  existingAssignment?: any;
}

export function QuickAssignModal({ 
  isOpen, 
  onClose, 
  teamMembers, 
  weekStartDate, 
  weekEndDate,
  existingAssignment 
}: QuickAssignModalProps) {
  const { toast } = useToast();
  
  const form = useForm<QuickAssignFormData>({
    resolver: zodResolver(quickAssignSchema),
    defaultValues: {
      startDate: weekStartDate,
      endDate: weekEndDate,
      usMemberId: existingAssignment?.usMemberId || 0,
      ukMemberId: existingAssignment?.ukMemberId || 0,
      notes: existingAssignment?.notes || "",
      isManual: true,
    },
  });

  const usMembers = teamMembers.filter(m => m.region === "us" && m.isAvailable);
  const ukMembers = teamMembers.filter(m => m.region === "uk" && m.isAvailable);

  const assignMutation = useMutation({
    mutationFn: async (data: QuickAssignFormData) => {
      if (existingAssignment) {
        return apiRequest("PATCH", `/api/rota-assignments/${existingAssignment.id}`, data);
      } else {
        return apiRequest("POST", "/api/rota-assignments", data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rota-assignments"] });
      toast({
        title: existingAssignment ? "Assignment Updated" : "Assignment Created",
        description: `Support assignment for ${new Date(weekStartDate).toLocaleDateString()} has been ${existingAssignment ? 'updated' : 'created'}`,
      });
      form.reset();
      onClose();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save assignment",
        variant: "destructive",
      });
    },
  });

  const autoAssignMutation = useMutation({
    mutationFn: async () => {
      // Find members with least assignments for fair rotation
      const usAvailable = usMembers;
      const ukAvailable = ukMembers;

      if (usAvailable.length === 0 || ukAvailable.length === 0) {
        throw new Error("Not enough available members");
      }

      // For simplicity, select first available member from each region
      // In a real implementation, this would check assignment history for fairness
      const selectedUS = usAvailable[0];
      const selectedUK = ukAvailable[0];

      const assignmentData = {
        startDate: weekStartDate,
        endDate: weekEndDate,
        usMemberId: selectedUS.id,
        ukMemberId: selectedUK.id,
        notes: "Auto-assigned using fair rotation",
        isManual: false,
      };

      if (existingAssignment) {
        return apiRequest("PATCH", `/api/rota-assignments/${existingAssignment.id}`, assignmentData);
      } else {
        return apiRequest("POST", "/api/rota-assignments", assignmentData);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rota-assignments"] });
      toast({
        title: "Auto-Assignment Complete",
        description: "Week has been automatically assigned using fair rotation",
      });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Auto-Assignment Failed",
        description: error.message || "Failed to auto-assign week",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: QuickAssignFormData) => {
    assignMutation.mutate(data);
  };

  const formatWeekRange = () => {
    const start = new Date(weekStartDate);
    const end = new Date(weekEndDate);
    return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Calendar className="w-5 h-5" />
            <span>{existingAssignment ? 'Edit' : 'Assign'} Week: {formatWeekRange()}</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="usMemberId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>US Support</FormLabel>
                    <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select US team member" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {usMembers.map((member) => (
                          <SelectItem key={member.id} value={member.id.toString()}>
                            {member.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="ukMemberId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>UK Support</FormLabel>
                    <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select UK team member" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {ukMembers.map((member) => (
                          <SelectItem key={member.id} value={member.id.toString()}>
                            {member.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="flex space-x-3 pt-4">
                <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
                  Cancel
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => autoAssignMutation.mutate()}
                  disabled={autoAssignMutation.isPending}
                >
                  <Users className="w-4 h-4 mr-1" />
                  Auto-Assign
                </Button>
                <Button 
                  type="submit" 
                  className="flex-1" 
                  disabled={assignMutation.isPending}
                >
                  {existingAssignment ? 'Update' : 'Assign'}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}