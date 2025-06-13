import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { TrendingUp, User, BarChart3 } from "lucide-react";

interface FairnessReportData {
  id: number;
  name: string;
  region: string;
  assignmentCount: number;
}

interface FairnessReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function FairnessReportModal({ isOpen, onClose }: FairnessReportModalProps) {
  const { data: fairnessData = [] } = useQuery<FairnessReportData[]>({
    queryKey: ["/api/reports/fairness"],
    enabled: isOpen,
  });

  const usMembers = fairnessData.filter(m => m.region === "us");
  const ukMembers = fairnessData.filter(m => m.region === "uk");

  const getAssignmentLevel = (count: number, avgCount: number, maxCount: number) => {
    if (maxCount === 0) return "none";
    
    // Calculate how far this member deviates from the average
    const deviationFromAvg = count - avgCount;
    const maxDeviation = maxCount - avgCount;
    
    // If everyone has the same count (no deviation), it's balanced
    if (maxDeviation === 0) return "balanced";
    
    // Calculate relative position compared to average
    if (deviationFromAvg > maxDeviation * 0.5) return "high";
    if (deviationFromAvg > maxDeviation * 0.1) return "above-average";
    if (deviationFromAvg < -maxDeviation * 0.5) return "low";
    if (deviationFromAvg < -maxDeviation * 0.1) return "below-average";
    
    return "balanced";
  };

  const getAssignmentBadge = (level: string) => {
    switch (level) {
      case "high":
        return <Badge className="bg-red-100 text-red-800">Above Fair Share</Badge>;
      case "above-average":
        return <Badge className="bg-orange-100 text-orange-800">Slightly High</Badge>;
      case "balanced":
        return <Badge className="bg-green-100 text-green-800">Balanced</Badge>;
      case "below-average":
        return <Badge className="bg-blue-100 text-blue-800">Slightly Low</Badge>;
      case "low":
        return <Badge className="bg-slate-100 text-slate-800">Below Fair Share</Badge>;
      default:
        return <Badge variant="secondary">No Assignments</Badge>;
    }
  };

  const maxAssignments = Math.max(...fairnessData.map(m => m.assignmentCount), 1);
  const avgAssignments = fairnessData.length > 0 
    ? fairnessData.reduce((sum, m) => sum + m.assignmentCount, 0) / fairnessData.length 
    : 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <TrendingUp className="w-5 h-5" />
            <span>Assignment Fairness Report</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <BarChart3 className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <p className="text-lg font-semibold text-slate-900">{maxAssignments}</p>
                <p className="text-xs text-slate-500">Max Assignments</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4 text-center">
                <TrendingUp className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <p className="text-lg font-semibold text-slate-900">{avgAssignments.toFixed(1)}</p>
                <p className="text-xs text-slate-500">Average Assignments</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4 text-center">
                <User className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                <p className="text-lg font-semibold text-slate-900">{fairnessData.length}</p>
                <p className="text-xs text-slate-500">Total Members</p>
              </CardContent>
            </Card>
          </div>

          {/* US Team Report */}
          <div>
            <h3 className="text-sm font-medium text-slate-900 mb-3 flex items-center space-x-2">
              <span>US Team Assignment History</span>
              <Badge variant="outline">{usMembers.length} members</Badge>
            </h3>
            <div className="space-y-2">
              {usMembers.map((member) => {
                const level = getAssignmentLevel(member.assignmentCount, avgAssignments, maxAssignments);
                return (
                  <Card key={member.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <User className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-900">{member.name}</p>
                            <p className="text-xs text-slate-500">
                              {member.assignmentCount} assignment{member.assignmentCount !== 1 ? 's' : ''}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {getAssignmentBadge(level)}
                        </div>
                      </div>
                      {/* Assignment bar */}
                      <div className="mt-3">
                        <div className="w-full bg-slate-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              level === "high" ? "bg-red-500" :
                              level === "above-average" ? "bg-orange-500" :
                              level === "low" ? "bg-blue-500" :
                              level === "below-average" ? "bg-slate-500" :
                              "bg-green-500"
                            }`}
                            style={{
                              width: `${maxAssignments > 0 ? (member.assignmentCount / maxAssignments) * 100 : 0}%`
                            }}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* UK Team Report */}
          <div>
            <h3 className="text-sm font-medium text-slate-900 mb-3 flex items-center space-x-2">
              <span>UK Team Assignment History</span>
              <Badge variant="outline">{ukMembers.length} members</Badge>
            </h3>
            <div className="space-y-2">
              {ukMembers.map((member) => {
                const level = getAssignmentLevel(member.assignmentCount, avgAssignments, maxAssignments);
                return (
                  <Card key={member.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                            <User className="w-5 h-5 text-purple-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-900">{member.name}</p>
                            <p className="text-xs text-slate-500">
                              {member.assignmentCount} assignment{member.assignmentCount !== 1 ? 's' : ''}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {getAssignmentBadge(level)}
                        </div>
                      </div>
                      {/* Assignment bar */}
                      <div className="mt-3">
                        <div className="w-full bg-slate-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              level === "high" ? "bg-red-500" :
                              level === "above-average" ? "bg-orange-500" :
                              level === "low" ? "bg-blue-500" :
                              level === "below-average" ? "bg-slate-500" :
                              "bg-green-500"
                            }`}
                            style={{
                              width: `${maxAssignments > 0 ? (member.assignmentCount / maxAssignments) * 100 : 0}%`
                            }}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end pt-4 border-t border-slate-200">
            <Button onClick={onClose} variant="outline">
              Close Report
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}