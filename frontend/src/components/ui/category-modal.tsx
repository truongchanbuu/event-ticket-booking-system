import * as React from "react";
import { categories } from "@/constants/categories";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./dialog";
import { Check, Loader2, Search, X } from "lucide-react";
import { Button } from "./button";
import { Input } from "./input";
import { Category } from "@/schema";

interface CategoryDialogProps {
  isModalOpen: boolean;
  closeModal: () => void;
  initialCategories: string[];
  onSave?: (selected: string[]) => Promise<void> | void;
  maxSelected?: number;
  title?: string;
}

export default function CategoryDialog({
  isModalOpen,
  closeModal,
  initialCategories,
  onSave,
  maxSelected,
  title = "Select Your Preferences",
}: CategoryDialogProps) {
  const [localSelected, setLocalSelected] = React.useState<string[]>([]);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [isSaving, setIsSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (isModalOpen) {
      setLocalSelected(initialCategories ?? []);
      setSearchTerm("");
      setError(null);
    }
  }, [isModalOpen, initialCategories]);

  const filteredCategories = React.useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return categories;
    return categories.filter((c) => {
      const name = c.name?.toLowerCase() ?? "";
      const desc = c.description?.toLowerCase() ?? "";
      return name.includes(term) || desc.includes(term);
    });
  }, [searchTerm]);

  const removeCategory = (id: string) => {
    setError(null);
    setLocalSelected((prev) => prev.filter((x) => x !== id));
  };

  const toggleCategory = (id: string) => {
    setError(null);
    setLocalSelected((prev) => {
      const exists = prev.includes(id);
      if (exists) return prev.filter((x) => x !== id);

      if (maxSelected && prev.length >= maxSelected) {
        setError(`You can select up to ${maxSelected} categories.`);
        return prev;
      }

      return [...prev, id];
    });
  };

  const savePreferences = async () => {
    setIsSaving(true);
    setError(null);
    try {
      await onSave?.(localSelected);
      closeModal();
    } catch (err: any) {
      setError(err?.message ?? "Failed to save preferences.");
    } finally {
      setIsSaving(false);
    }
  };

  const count = localSelected.length;

  return (
    <Dialog
      open={isModalOpen}
      onOpenChange={(open) => {
        if (!open) closeModal();
      }}
    >
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {title}
            <span className="ml-2 bg-primary text-white text-xs px-2 py-1 rounded-full">
              {count}
            </span>
          </DialogTitle>
          <DialogDescription>Select preferred categories.</DialogDescription>
          {maxSelected ? (
            <p className="text-xs text-muted-foreground mt-1">
              You can select up to {maxSelected} categories.
            </p>
          ) : null}
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6 px-1">
          <div>
            <div className="min-h-[60px] p-4 bg-muted/50 rounded-lg border-2 border-dashed border-border">
              {count ? (
                <div className="flex flex-wrap gap-2">
                  {localSelected.map((catId) => {
                    const category = categories.find((c) => c.id === catId);
                    if (!category) return null;
                    return (
                      <span
                        key={category.id}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium text-white cursor-pointer hover:opacity-90"
                        style={{ backgroundColor: category.color }}
                      >
                        <span className="mr-1">{category.icon}</span>
                        {category.name}
                        <Button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeCategory(category.id);
                          }}
                          variant="ghost"
                          size="icon"
                          className="ml-2 h-4 w-4 p-0 hover:bg-black/20 rounded-full text-white"
                        >
                          <X size={12} />
                        </Button>
                      </span>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center text-muted-foreground text-sm py-4">
                  Click categories below to add them
                </div>
              )}
            </div>
          </div>

          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              size={18}
            />
            <Input
              type="text"
              placeholder="Search categories..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-input rounded-md bg-background focus:ring-2 focus:ring-ring focus:border-transparent"
            />
          </div>

          <div>
            <h3 className="font-medium mb-3">Available Categories</h3>
            <div className="m-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredCategories.map((category: Category) => {
                const isSelected = localSelected.includes(category.id);
                return (
                  <div
                    key={category.id}
                    onClick={() => toggleCategory(category.id)}
                    className={`p-3 rounded-lg border-2 cursor-pointer transition-all hover:scale-105 ${
                      isSelected
                        ? "border-green-500 bg-green-50 dark:bg-green-950"
                        : "border-border bg-card hover:border-muted-foreground/50"
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center">
                        <span className="text-xl mr-2">{category.icon}</span>
                        <h4 className="font-medium">{category.name}</h4>
                      </div>
                      {isSelected && (
                        <div className="bg-green-500 text-white rounded-full p-1">
                          <Check size={14} />
                        </div>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {category.description}
                    </p>
                    <div
                      className="w-full h-1 rounded"
                      style={{ backgroundColor: category.color }}
                    />
                  </div>
                );
              })}
            </div>

            {filteredCategories.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <div className="text-2xl mb-2">🔍</div>
                <p>No categories found</p>
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="px-1 text-sm text-destructive text-center">
            {error}
          </div>
        )}

        <DialogFooter className="border-t pt-4">
          <Button
            type="button"
            onClick={closeModal}
            className="bg-red-500 text-white hover:bg-red-500/80"
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button type="button" onClick={savePreferences} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4" />
                Saving...
              </>
            ) : (
              <>
                <Check size={16} className="mr-2" />
                Save ({count})
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
