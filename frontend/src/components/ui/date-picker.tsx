import { useState } from "react";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { CalendarDays, ChevronDown } from "lucide-react";

interface DatePickerProps {
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  label?: string;
}

export default function EventStyleDatePicker({
  value,
  onValueChange,
  placeholder = "Select date",
  label = "Date",
}: DatePickerProps) {
  const [mode, setMode] = useState<"single" | "range">("single");
  const [selectedDate, setSelectedDate] = useState<string>(value || "");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [isOpen, setIsOpen] = useState(false);

  // Quick date options
  const quickOptions = [
    { value: "today", label: "Today" },
    { value: "tomorrow", label: "Tomorrow" },
    { value: "this-week", label: "This Week" },
    { value: "next-week", label: "Next Week" },
    { value: "this-month", label: "This Month" },
    { value: "next-month", label: "Next Month" },
  ];

  const getDisplayValue = () => {
    if (mode === "single") {
      if (!selectedDate) return placeholder;
      const date = new Date(selectedDate);
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } else {
      if (!startDate && !endDate) return "Select date range";
      if (startDate && !endDate) {
        const date = new Date(startDate);
        return date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        });
      }
      if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        return `${start.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        })} - ${end.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })}`;
      }
    }
    return placeholder;
  };

  const handleQuickSelect = (value: string) => {
    const today = new Date();
    let targetDate = new Date();

    switch (value) {
      case "today":
        targetDate = today;
        break;
      case "tomorrow":
        targetDate = new Date(today.getTime() + 24 * 60 * 60 * 1000);
        break;
      case "this-week":
        const thisWeekStart = new Date(today);
        thisWeekStart.setDate(today.getDate() - today.getDay());
        const thisWeekEnd = new Date(thisWeekStart);
        thisWeekEnd.setDate(thisWeekStart.getDate() + 6);
        setStartDate(thisWeekStart.toISOString().split("T")[0]);
        setEndDate(thisWeekEnd.toISOString().split("T")[0]);
        setMode("range");
        setIsOpen(false);
        return;
      case "next-week":
        const nextWeekStart = new Date(today);
        nextWeekStart.setDate(today.getDate() + (7 - today.getDay()));
        const nextWeekEnd = new Date(nextWeekStart);
        nextWeekEnd.setDate(nextWeekStart.getDate() + 6);
        setStartDate(nextWeekStart.toISOString().split("T")[0]);
        setEndDate(nextWeekEnd.toISOString().split("T")[0]);
        setMode("range");
        setIsOpen(false);
        return;
      case "this-month":
        const thisMonthStart = new Date(
          today.getFullYear(),
          today.getMonth(),
          1
        );
        const thisMonthEnd = new Date(
          today.getFullYear(),
          today.getMonth() + 1,
          0
        );
        setStartDate(thisMonthStart.toISOString().split("T")[0]);
        setEndDate(thisMonthEnd.toISOString().split("T")[0]);
        setMode("range");
        setIsOpen(false);
        return;
      case "next-month":
        const nextMonthStart = new Date(
          today.getFullYear(),
          today.getMonth() + 1,
          1
        );
        const nextMonthEnd = new Date(
          today.getFullYear(),
          today.getMonth() + 2,
          0
        );
        setStartDate(nextMonthStart.toISOString().split("T")[0]);
        setEndDate(nextMonthEnd.toISOString().split("T")[0]);
        setMode("range");
        setIsOpen(false);
        return;
    }

    const dateString = targetDate.toISOString().split("T")[0];
    setSelectedDate(dateString);
    setMode("single");
    onValueChange?.(dateString);
    setIsOpen(false);
  };

  const handleModeChange = (newMode: "single" | "range") => {
    setMode(newMode);
    setSelectedDate("");
    setStartDate("");
    setEndDate("");
  };

  const handleSingleDateChange = (date: string) => {
    setSelectedDate(date);
    onValueChange?.(date);
  };

  const clearDates = () => {
    setSelectedDate("");
    setStartDate("");
    setEndDate("");
    onValueChange?.("");
  };

  const applySelection = () => {
    if (mode === "single" && selectedDate) {
      onValueChange?.(selectedDate);
    } else if (mode === "range" && startDate && endDate) {
      onValueChange?.(`${startDate} to ${endDate}`);
    }
    setIsOpen(false);
  };

  return (
    <div className="flex flex-col gap-2">
      <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </Label>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="w-full justify-between text-left font-normal h-10 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-black"
          >
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-gray-500" />
              <span className="text-sm">{getDisplayValue()}</span>
            </div>
            <ChevronDown className="h-4 w-4 text-gray-500" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-80 p-0 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-lg"
          align="start"
        >
          <div className="p-4 bg-white dark:bg-gray-800">
            {/* Mode Toggle */}
            <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1 mb-4">
              <Button
                variant={mode === "single" ? "default" : "ghost"}
                size="sm"
                className="flex-1 text-xs"
                onClick={() => handleModeChange("single")}
              >
                Single Date
              </Button>
              <Button
                variant={mode === "range" ? "default" : "ghost"}
                size="sm"
                className="flex-1 text-xs"
                onClick={() => handleModeChange("range")}
              >
                Date Range
              </Button>
            </div>

            {/* Quick Options */}
            <div className="space-y-2 mb-4">
              <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                Quick Select
              </div>
              <div className="grid grid-cols-2 gap-2">
                {quickOptions.map((option) => (
                  <Button
                    key={option.value}
                    variant="outline"
                    size="sm"
                    className="text-xs justify-start"
                    onClick={() => handleQuickSelect(option.value)}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Custom Date Selection */}
            <div className="space-y-3">
              <div className="text-xs font-medium text-gray-700 dark:text-gray-300">
                Custom Date
              </div>

              {mode === "single" ? (
                <div>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => handleSingleDateChange(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <div>
                    <label className="text-xs text-gray-600 dark:text-gray-400 mb-1 block">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-600 dark:text-gray-400 mb-1 block">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      min={startDate}
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2 mt-4 pt-3 border-t border-gray-200 dark:border-gray-600">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 text-xs"
                onClick={clearDates}
              >
                Clear
              </Button>
              <Button
                size="sm"
                className="flex-1 text-xs"
                onClick={applySelection}
              >
                Apply
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
