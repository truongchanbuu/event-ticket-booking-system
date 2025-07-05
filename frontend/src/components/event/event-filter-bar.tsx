import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Search, Grid, List, Check, ChevronsUpDown, X } from "lucide-react";
import type { EventFilters } from "@/schema";
import { cn } from "@/lib/utils";
import { categories } from "@/constants/categories";
import DatePicker from "../ui/date-picker";

interface FilterBarProps {
  filters: EventFilters;
  onFiltersChange: (filters: EventFilters) => void;
  viewMode: "grid" | "list";
  onViewModeChange: (mode: "grid" | "list") => void;
}

const SEARCH_DEBOUNCE_DELAY = 300;

export default function EventFilterBar({
  filters,
  onFiltersChange,
  viewMode,
  onViewModeChange,
}: FilterBarProps) {
  const [searchTerm, setSearchTerm] = useState(filters.search || "");
  const [open, setOpen] = useState(false);

  // Debounced search
  const debouncedSearch = useCallback(
    (() => {
      let timeoutId: NodeJS.Timeout;
      return (value: string) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          onFiltersChange({ ...filters, search: value || undefined });
        }, SEARCH_DEBOUNCE_DELAY);
      };
    })(),
    [filters, onFiltersChange]
  );

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    debouncedSearch(value);
  };

  // Sync search term with filters when filters change externally
  useEffect(() => {
    setSearchTerm(filters.search || "");
  }, [filters.search]);

  const handleCategoryChange = (categoryId: string) => {
    const currentCategories = filters.categories || [];
    let newCategories: string[];

    if (currentCategories.includes(categoryId)) {
      // Remove category if already selected
      newCategories = currentCategories.filter((id) => id !== categoryId);
    } else {
      // Add category if not selected
      newCategories = [...currentCategories, categoryId];
    }

    onFiltersChange({
      ...filters,
      categories: newCategories.length > 0 ? newCategories : undefined,
    });
  };

  const removeCategory = (categoryId: string) => {
    const currentCategories = filters.categories || [];
    const newCategories = currentCategories.filter((id) => id !== categoryId);

    onFiltersChange({
      ...filters,
      categories: newCategories.length > 0 ? newCategories : undefined,
    });
  };

  const clearAllCategories = () => {
    onFiltersChange({
      ...filters,
      categories: undefined,
    });
  };

  const handleDateChange = (date: string) => {
    onFiltersChange({ ...filters, date });
  };

  const handleTimeRangeChange = (timeRange: string) => {
    onFiltersChange({
      ...filters,
      timeRange: timeRange === "all" ? undefined : timeRange,
    });
  };

  const selectedCategories = filters.categories || [];
  const selectedCategoryNames = selectedCategories.map(
    (id) => categories.find((cat) => cat.id === id)?.name || id
  );

  return (
    <Card className="shadow-sm border border-gray-200">
      <CardContent className="p-6">
        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search events, locations, or keywords..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Filter Controls */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Multi-Category Filter */}
          <div className="flex flex-col gap-2">
            <Label className="text-sm font-medium text-gray-700">
              Categories
            </Label>
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={open}
                  className="justify-between"
                >
                  {selectedCategories.length === 0
                    ? "Select categories..."
                    : `${selectedCategories.length} selected`}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[300px] p-0">
                <Command>
                  <CommandInput placeholder="Search categories..." />
                  <CommandList>
                    <CommandEmpty>No category found.</CommandEmpty>
                    <CommandGroup>
                      {categories.map((category) => (
                        <CommandItem
                          key={category.id}
                          onSelect={() => handleCategoryChange(category.id)}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedCategories.includes(category.id)
                                ? "opacity-100"
                                : "opacity-0"
                            )}
                          />
                          {category.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>

            {/* Selected Categories Display */}
            {selectedCategories.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {selectedCategories.map((categoryId) => {
                  const category = categories.find(
                    (cat) => cat.id === categoryId
                  );
                  return (
                    <Badge
                      key={categoryId}
                      variant="secondary"
                      className="text-xs"
                    >
                      {category?.name || categoryId}
                      <button
                        onClick={() => removeCategory(categoryId)}
                        className="ml-1 hover:bg-gray-300 rounded-full p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  );
                })}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAllCategories}
                  className="text-xs h-6 px-2"
                >
                  Clear all
                </Button>
              </div>
            )}
          </div>

          <DatePicker />

          {/* Time Filter */}
          <div className="flex flex-col gap-2">
            <Label className="text-sm font-medium text-gray-700">Time</Label>
            <Select
              value={filters.timeRange || "all"}
              onValueChange={handleTimeRangeChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Any Time" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any Time</SelectItem>
                <SelectItem value="morning">Morning (6AM-12PM)</SelectItem>
                <SelectItem value="afternoon">Afternoon (12PM-6PM)</SelectItem>
                <SelectItem value="evening">Evening (6PM-12AM)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* View Toggle */}
          <div className="flex items-end">
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-full">
              <Button
                type="button"
                variant={viewMode === "grid" ? "default" : "ghost"}
                size="sm"
                className={cn(
                  "flex-1 hover:bg-primary hover:text-white",
                  viewMode === "grid" && "text-white"
                )}
                onClick={() => onViewModeChange("grid")}
              >
                <Grid className="h-4 w-4 mr-1" />
                Grid
              </Button>
              <Button
                type="button"
                variant={viewMode === "list" ? "default" : "ghost"}
                size="sm"
                className={cn(
                  "flex-1 hover:bg-primary hover:text-white",
                  viewMode === "list" && "text-white"
                )}
                onClick={() => onViewModeChange("list")}
              >
                <List className="h-4 w-4 mr-1" />
                List
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
