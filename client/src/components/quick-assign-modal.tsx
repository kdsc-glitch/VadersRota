import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useForm } from "react-hook-form";
import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertRotaAssignmentSchema } from "@shared/schema";
import { z } from "zod";
import { Calendar, Users, Loader2, Sparkles } from "lucide-react";
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
  const [loadingStageModal, setLoadingStageModal] = useState<string>("");
  
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
      // Enhanced loading stages for better UX
      setLoadingStageModal("Analyzing team availability...");
      await new Promise(resolve => setTimeout(resolve, 600));
      
      setLoadingStageModal("Applying fair rotation algorithm...");
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setLoadingStageModal("Checking holiday conflicts...");
      await new Promise(resolve => setTimeout(resolve, 400));
      
      setLoadingStageModal("Finalizing assignments...");
      
      return apiRequest("POST", "/api/rota-assignments/auto-assign", {
        startDate: weekStartDate,
        endDate: weekEndDate,
      });
    },
    onSuccess: (data: any) => {
      setLoadingStageModal("Assignment complete!");
      setTimeout(() => setLoadingStageModal(""), 800);
      
      queryClient.invalidateQueries({ queryKey: ["/api/rota-assignments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/rota-assignments/current"] });
      queryClient.invalidateQueries({ queryKey: ["/api/rota-assignments/upcoming"] });
      
      // Handle assignment success - distinguish between full and partial
      if (data.assignments && data.skippedDays) {
        if (data.skippedDays.length === 0) {
          // Full assignment - all days successfully assigned
          toast({
            title: "Week Successfully Assigned",
            description: `All ${data.assignments.length} days have been assigned using fair rotation`,
          });
        } else {
          // Partial assignment - some days were skipped
          toast({
            title: "Partial Assignment Complete",
            description: `${data.assignments.length} days assigned, ${data.skippedDays.length} days skipped due to conflicts`,
          });
        }
      } else {
        toast({
          title: "Auto-Assignment Complete",
          description: "Week has been automatically assigned using fair rotation",
        });
      }
      
      setTimeout(() => onClose(), 1000);
    },
    onError: (error: any) => {
      setLoadingStageModal("");
      
      // Extract error details from response
      const errorData = error.response?.data || error.data || {};
      console.log('Quick assign modal auto-assign error:', errorData);
      
      let errorMessage = "Failed to auto-assign week";
      
      if (errorData.message) {
        errorMessage = errorData.message;
        
        if (errorData.conflicts && errorData.conflicts.length > 0) {
          errorMessage += `\n\nConflicts:\n${errorData.conflicts.join('\n')}`;
        }
        
        if (errorData.period) {
          errorMessage += `\n\nPeriod: ${errorData.period}`;
        }
      }
      
      toast({
        title: "Auto-Assignment Failed",
        description: errorMessage,
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
              
              {/* Loading stage indicator */}
              {autoAssignMutation.isPending && loadingStageModal && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg mb-4">
                  <div className="flex items-center space-x-2">
                    <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                    <span className="text-sm text-blue-800 animate-pulse">
                      {loadingStageModal}
                    </span>
                  </div>
                </div>
              )}
              
              <div className="flex space-x-3 pt-4">
                <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
                  Cancel
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  className={`flex-1 transition-all duration-300 ${
                    autoAssignMutation.isPending ? 'bg-blue-50 border-blue-200' : ''
                  }`}
                  onClick={() => autoAssignMutation.mutate()}
                  disabled={autoAssignMutation.isPending}
                >
                  {autoAssignMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                      <Sparkles className="w-3 h-3 mr-1 animate-pulse" />
                      Auto-Assigning...
                    </>
                  ) : (
                    <>
                      <Users className="w-4 h-4 mr-1" />
                      Auto-Assign
                    </>
                  )}
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