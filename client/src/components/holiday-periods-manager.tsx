import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Plus, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface HolidayPeriod {
  id: string;
  startDate: Date;
  endDate: Date;
  description: string;
}

interface HolidayPeriodsManagerProps {
  holidays: HolidayPeriod[];
  onHolidaysChange: (holidays: HolidayPeriod[]) => void;
}

export function HolidayPeriodsManager({ holidays, onHolidaysChange }: HolidayPeriodsManagerProps) {
  const [newStartDate, setNewStartDate] = useState<Date>();
  const [newEndDate, setNewEndDate] = useState<Date>();
  const [newDescription, setNewDescription] = useState("");

  const addHolidayPeriod = () => {
    if (newStartDate && newEndDate) {
      if (newStartDate > newEndDate) {
        alert("Start date must be before or equal to end date");
        return;
      }

      const newHoliday: HolidayPeriod = {
        id: Date.now().toString(),
        startDate: newStartDate,
        endDate: newEndDate,
        description: newDescription || `Holiday ${format(newStartDate, "MMM dd")} - ${format(newEndDate, "MMM dd")}`
      };

      onHolidaysChange([...holidays, newHoliday]);
      
      // Reset form
      setNewStartDate(undefined);
      setNewEndDate(undefined);
      setNewDescription("");
    } else {
      alert("Please select both start and end dates");
    }
  };

  const removeHolidayPeriod = (id: string) => {
    onHolidaysChange(holidays.filter(h => h.id !== id));
  };

  const updateHolidayDescription = (id: string, description: string) => {
    onHolidaysChange(holidays.map(h => 
      h.id === id ? { ...h, description } : h
    ));
  };

  return (
    <div className="space-y-4">
      <Label className="text-sm font-medium">Holiday Periods</Label>
      
      {/* Existing holidays */}
      {holidays.length > 0 && (
        <div className="space-y-2">
          {holidays.map((holiday) => (
            <div key={holiday.id} className="flex items-center space-x-2 p-2 border rounded-lg">
              <div className="flex-1">
                <div className="text-sm font-medium">
                  {format(holiday.startDate, "MMM dd, yyyy")} - {format(holiday.endDate, "MMM dd, yyyy")}
                </div>
                <Input
                  value={holiday.description}
                  onChange={(e) => updateHolidayDescription(holiday.id, e.target.value)}
                  placeholder="Holiday description..."
                  className="mt-1 text-xs"
                />
              </div>
              <Button
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
        <div className="text-sm font-medium">Add New Holiday Period</div>
        
        <div className="grid grid-cols-2 gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button
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

        <Button onClick={addHolidayPeriod} size="sm" className="w-full">
          <Plus className="w-4 h-4 mr-1" />
          Add Holiday Period
        </Button>
      </div>
    </div>
  );
}