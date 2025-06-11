import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FlagIcon, Building, Calendar, Clock } from "lucide-react";
import type { TeamMember, RotaAssignment } from "@shared/schema";

interface DashboardStatsProps {
  currentUSMember: TeamMember | null | undefined;
  currentUKMember: TeamMember | null | undefined;
  nextRotationDate: string;
  currentAssignment: RotaAssignment | undefined;
}

export function DashboardStats({ 
  currentUSMember, 
  currentUKMember, 
  nextRotationDate,
  currentAssignment 
}: DashboardStatsProps) {
  const getEndDate = () => {
    if (!currentAssignment) return "";
    return new Date(currentAssignment.endDate).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const getDaysUntilNext = () => {
    if (!currentAssignment) return "";
    const endDate = new Date(currentAssignment.endDate);
    const today = new Date();
    const diffTime = endDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? `${diffDays} days` : "Today";
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Current US Support</p>
              <p className="text-2xl font-semibold text-slate-900">
                {currentUSMember?.name || "Not assigned"}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <FlagIcon className="text-blue-600 w-6 h-6" />
            </div>
          </div>
          <div className="mt-4 flex items-center space-x-2">
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              <div className="w-2 h-2 bg-green-400 rounded-full mr-1"></div>
              Active
            </Badge>
            <span className="text-xs text-slate-500">Until {getEndDate()}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Current UK Support</p>
              <p className="text-2xl font-semibold text-slate-900">
                {currentUKMember?.name || "Not assigned"}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <FlagIcon className="text-blue-600 w-6 h-6" />
            </div>
          </div>
          <div className="mt-4 flex items-center space-x-2">
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              <div className="w-2 h-2 bg-green-400 rounded-full mr-1"></div>
              Active
            </Badge>
            <span className="text-xs text-slate-500">Until {getEndDate()}</span>
          </div>
        </CardContent>
      </Card>



      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Next Rotation</p>
              <p className="text-2xl font-semibold text-slate-900">{nextRotationDate}</p>
            </div>
            <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
              <Calendar className="text-amber-600 w-6 h-6" />
            </div>
          </div>
          <div className="mt-4 flex items-center space-x-2">
            <Badge variant="secondary" className="bg-amber-100 text-amber-800">
              <Clock className="w-3 h-3 text-amber-400 mr-1" />
              {getDaysUntilNext()}
            </Badge>
            <span className="text-xs text-slate-500">Auto-assigned</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
