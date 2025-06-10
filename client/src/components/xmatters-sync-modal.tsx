import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { FolderSync, AlertCircle, CheckCircle, RefreshCw } from "lucide-react";
import type { TeamMember } from "@shared/schema";

const xMattersConfigSchema = z.object({
  xMattersUrl: z.string().url("Please enter a valid xMatters URL"),
  apiToken: z.string().min(1, "API token is required"),
  groupId: z.string().min(1, "DSG group ID is required"),
});

type XMattersConfigData = z.infer<typeof xMattersConfigSchema>;

interface XMattersSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function XMattersSyncModal({ isOpen, onClose }: XMattersSyncModalProps) {
  const { toast } = useToast();
  
  const { data: teamMembers = [] } = useQuery<TeamMember[]>({
    queryKey: ["/api/team-members"],
  });

  const form = useForm<XMattersConfigData>({
    resolver: zodResolver(xMattersConfigSchema),
    defaultValues: {
      xMattersUrl: "https://your-company.xmatters.com",
      apiToken: "",
      groupId: "dsg-group",
    },
  });

  const testConnectionMutation = useMutation({
    mutationFn: async (data: XMattersConfigData) => {
      // This would integrate with actual xMatters API
      return apiRequest("POST", "/api/xmatters/test-connection", data);
    },
    onSuccess: () => {
      toast({
        title: "Connection Successful",
        description: "Successfully connected to xMatters DSG group",
      });
    },
    onError: () => {
      toast({
        title: "Connection Failed",
        description: "Unable to connect to xMatters. Please check your credentials and try again.",
        variant: "destructive",
      });
    },
  });

  const syncRotaMutation = useMutation({
    mutationFn: async (data: XMattersConfigData) => {
      return apiRequest("POST", "/api/xmatters/sync-rota", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/team-members"] });
      queryClient.invalidateQueries({ queryKey: ["/api/rota-assignments"] });
      toast({
        title: "Sync Complete",
        description: "DSG main rota has been synchronized from xMatters",
      });
    },
    onError: () => {
      toast({
        title: "Sync Failed",
        description: "Failed to synchronize with xMatters DSG rota",
        variant: "destructive",
      });
    },
  });

  const onTestConnection = (data: XMattersConfigData) => {
    testConnectionMutation.mutate(data);
  };

  const onSyncRota = (data: XMattersConfigData) => {
    syncRotaMutation.mutate(data);
  };

  const dsgMembers = teamMembers.filter(m => m.isDsgMember);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <FolderSync className="w-5 h-5" />
            <span>xMatters DSG Rota Sync</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Current DSG Members */}
          <div>
            <h3 className="text-sm font-medium text-slate-900 mb-3">Current DSG Members</h3>
            {dsgMembers.length > 0 ? (
              <div className="space-y-2">
                {dsgMembers.map((member) => (
                  <Card key={member.id}>
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-slate-900">{member.name}</p>
                          <p className="text-xs text-slate-500">{member.region.toUpperCase()}</p>
                        </div>
                        <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                          DSG Main
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-4 text-center">
                  <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                  <p className="text-sm text-slate-600">No DSG members configured</p>
                  <p className="text-xs text-slate-500">Sync with xMatters to import DSG assignments</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* xMatters Configuration */}
          <div>
            <h3 className="text-sm font-medium text-slate-900 mb-3">xMatters Configuration</h3>
            <Form {...form}>
              <form className="space-y-4">
                <FormField
                  control={form.control}
                  name="xMattersUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>xMatters URL</FormLabel>
                      <FormControl>
                        <Input placeholder="https://your-company.xmatters.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="apiToken"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>API Token</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Enter your xMatters API token" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="groupId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>DSG Group ID</FormLabel>
                      <FormControl>
                        <Input placeholder="dsg-group" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </form>
            </Form>
          </div>

          {/* Integration Status */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <FolderSync className="w-4 h-4 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-900">Integration Status</p>
                  <p className="text-xs text-slate-500">
                    Connect to xMatters to automatically sync DSG main rota assignments
                  </p>
                </div>
                <Badge variant="secondary" className="bg-amber-100 text-amber-800">
                  Not Connected
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
              Close
            </Button>
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={form.handleSubmit(onTestConnection)}
              disabled={testConnectionMutation.isPending}
            >
              <CheckCircle className="w-4 h-4 mr-1" />
              Test Connection
            </Button>
            <Button
              type="button"
              className="flex-1"
              onClick={form.handleSubmit(onSyncRota)}
              disabled={syncRotaMutation.isPending}
            >
              <RefreshCw className="w-4 h-4 mr-1" />
              Sync Now
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}