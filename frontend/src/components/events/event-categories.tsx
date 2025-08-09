import { Badge } from "@/components/ui/badge";
import {
  Music,
  Trophy,
  Laptop,
  Utensils,
  Palette,
  Briefcase,
  Calendar,
  Users,
  MapPin,
  Star,
} from "lucide-react";
import { getCategoryColor } from "@/lib/utils";
import { categories as allCategories } from "@/constants/categories";
import { Category } from "@/schema";

const categoryIcons = {
  music: Music,
  sports: Trophy,
  tech: Laptop,
  food: Utensils,
  art: Palette,
  business: Briefcase,
  festival: Calendar,
  conference: Users,
  workshop: Laptop,
  exhibition: Palette,
  concert: Music,
  meetup: Users,
  seminar: Briefcase,
  party: Star,
  networking: Users,
  training: Laptop,
  competition: Trophy,
  show: Star,
  fair: MapPin,
  gala: Star,
};

interface EventCategoriesProps {
  categories: string[];
  variant?: "badge" | "inline" | "compact";
  maxDisplay?: number;
  showAll?: boolean;
  className?: string;
}

export default function EventCategories({
  categories,
  variant = "badge",
  maxDisplay = 3,
  showAll = false,
  className = "",
}: EventCategoriesProps) {
  if (!categories || categories.length === 0) return null;

  const mainCategories = categories
    .map((id) => allCategories.find((cat) => cat.id === id))
    .filter(Boolean) as Category[];

  const displayCategories = showAll
    ? mainCategories
    : mainCategories.slice(0, maxDisplay);
  const hasMore = !showAll && mainCategories.length > maxDisplay;

  const getCategoryIcon = (categoryId: string) => {
    const Icon = categoryIcons[categoryId as keyof typeof categoryIcons];
    return Icon || Calendar;
  };

  if (variant === "inline") {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        {displayCategories.map((category, index) => {
          const Icon = getCategoryIcon(category.id);
          const color = getCategoryColor(category.id);

          return (
            <div key={category.id} className="flex items-center space-x-1">
              <Icon className={`h-4 w-4 ${color}`} />
              <span className={`text-sm font-medium ${color}`}>
                {category.name}
              </span>
              {index < displayCategories.length - 1 && (
                <span className="text-gray-300">•</span>
              )}
            </div>
          );
        })}
        {hasMore && (
          <span className="text-sm text-gray-500">
            +{mainCategories.length - maxDisplay} more
          </span>
        )}
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <div className={`flex flex-wrap gap-1 ${className}`}>
        {displayCategories.map((category) => {
          const Icon = getCategoryIcon(category.id);
          const color = getCategoryColor(category.id);

          return (
            <Badge
              key={category.id}
              variant="outline"
              className={`${color} border-current text-xs px-2 py-1`}
            >
              <Icon className="h-3 w-3 mr-1" />
              {category.name}
            </Badge>
          );
        })}
        {hasMore && (
          <Badge variant="outline" className="text-xs px-2 py-1">
            +{mainCategories.length - maxDisplay}
          </Badge>
        )}
      </div>
    );
  }

  // Default badge variant
  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {displayCategories.map((category) => {
        const Icon = getCategoryIcon(category.id);
        const color = getCategoryColor(category.id);

        return (
          <Badge key={category.id} className={`${color} text-white`}>
            <Icon className="h-3 w-3 mr-1" />
            {category.name}
          </Badge>
        );
      })}
      {hasMore && (
        <Badge variant="outline" className="text-gray-600">
          +{categories.length - maxDisplay} more
        </Badge>
      )}
    </div>
  );
}
