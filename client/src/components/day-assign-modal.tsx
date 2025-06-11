
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { Calendar, User } from "lucide-react";
import type { TeamMember } from "@shared/schema";

const dayAssignSchema = z.object({
  date: z.string().min(1, "Date is required"),
  usMemberId: z.coerce.number().min(1, "Please select a US team member"),
  ukMemberId: z.coerce.number().min(1, "Please select a UK team member"),
});

type DayAssignFormData = z.infer<typeof dayAssignSchema>;

interface DayAssignModalProps {
  isOpen: boolean;
  onClose: () => void;
  teamMembers: TeamMember[];
  selectedDate: string;
  existingAssignment?: any;
}

export function DayAssignModal({ 
  isOpen, 
  onClose, 
  teamMembers, 
  selectedDate,
  existingAssignment 
}: DayAssignModalProps) {
  const { toast } = useToast();
  
  const form = useForm<DayAssignFormData>({
    resolver: zodResolver(dayAssignSchema),
    defaultValues: {
      date: selectedDate,
      usMemberId: existingAssignment?.usMemberId || 0,
      ukMemberId: existingAssignment?.ukMemberId || 0,
    },
  });

  const usMembers = teamMembers.filter(m => m.region === "us" && m.isAvailable);
  const ukMembers = teamMembers.filter(m => m.region === "uk" && m.isAvailable);

  const assignMutation = useMutation({
    mutationFn: async (data: DayAssignFormData) => {
      // For day-level assignments, we create or update a single-day assignment
      const assignmentData = {
        startDate: data.date,
        endDate: data.date,
        usMemberId: data.usMemberId,
        ukMemberId: data.ukMemberId,
        notes: `Single day assignment for ${new Date(data.date).toLocaleDateString()}`,
        isManual: true,
      };

      if (existingAssignment) {
        return apiRequest("PATCH", `/api/rota-assignments/${existingAssignment.id}`, assignmentData);
      } else {
        return apiRequest("POST", "/api/rota-assignments", assignmentData);
      }
    },
    onSuccess: () => {
      // Invalidate all related queries to ensure UI updates
      queryClient.invalidateQueries({ queryKey: ["/api/rota-assignments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/rota-assignments/current"] });
      queryClient.invalidateQueries({ queryKey: ["/api/rota-assignments/upcoming"] });
      queryClient.invalidateQueries({ queryKey: ["/api/reports/fairness"] });
      
      toast({
        title: existingAssignment ? "Day Updated" : "Day Assigned",
        description: `Support assignment for ${new Date(selectedDate).toLocaleDateString()} has been ${existingAssignment ? 'updated' : 'created'}`,
      });
      form.reset();
      onClose();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save day assignment",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: DayAssignFormData) => {
    console.log('Day assignment form data:', data);
    console.log('Form errors:', form.formState.errors);
    assignMutation.mutate(data);
  };

  const formatDate = () => {
    return new Date(selectedDate).toLocaleDateString('en-US', { 
      weekday: 'long',
      month: 'long', 
      day: 'numeric' 
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Calendar className="w-5 h-5" />
            <span>{existingAssignment ? 'Edit' : 'Assign'} Day: {formatDate()}</span>
          </DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="usMemberId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>US Support</FormLabel>
                  <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value > 0 ? field.value.toString() : ""}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select US team member" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {usMembers.map((member) => (
                        <SelectItem key={member.id} value={member.id.toString()}>
                          <div className="flex items-center space-x-2">
                            <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                              <User className="w-3 h-3 text-blue-600" />
                            </div>
                            <span>{member.name}</span>
                          </div>
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
                  <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value > 0 ? field.value.toString() : ""}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select UK team member" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {ukMembers.map((member) => (
                        <SelectItem key={member.id} value={member.id.toString()}>
                          <div className="flex items-center space-x-2">
                            <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                              <User className="w-3 h-3 text-blue-600" />
                            </div>
                            <span>{member.name}</span>
                          </div>
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
                type="submit" 
                className="flex-1" 
                disabled={assignMutation.isPending}
              >
                {existingAssignment ? 'Update Day' : 'Assign Day'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}