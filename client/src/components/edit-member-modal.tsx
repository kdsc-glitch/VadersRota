import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { type TeamMember } from "@shared/schema";
import { z } from "zod";

const editMemberSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  region: z.enum(["us", "uk"], { required_error: "Please select a region" }),
});

type EditMemberFormData = z.infer<typeof editMemberSchema>;

interface EditMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: TeamMember | null;
}

export function EditMemberModal({ isOpen, onClose, member }: EditMemberModalProps) {
  const { toast } = useToast();

  const form = useForm<EditMemberFormData>({
    resolver: zodResolver(editMemberSchema),
    defaultValues: {
      name: "",
      email: "",
      region: "us",
    },
  });

  // Update form when member changes
  useEffect(() => {
    if (member) {
      form.reset({
        name: member.name,
        email: member.email,
        region: member.region as "us" | "uk",
      });
    }
  }, [member, form]);

  const updateMemberMutation = useMutation({
    mutationFn: (data: EditMemberFormData) => {
      if (!member) throw new Error("No member selected");
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
      const errorMessage = error?.message || "Failed to update team member";
      toast({
        title: "Update Failed",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: EditMemberFormData) => {
    updateMemberMutation.mutate(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
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
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter full name" {...field} />
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
                      <SelectItem value="us">United States</SelectItem>
                      <SelectItem value="uk">United Kingdom</SelectItem>
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
              <Button type="submit" className="flex-1" disabled={updateMemberMutation.isPending}>
                Update Member
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}