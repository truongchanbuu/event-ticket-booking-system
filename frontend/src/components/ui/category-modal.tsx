import * as React from "react";
import { categories } from "@/constants/categories";
import {
  Dialog,
  DialogContent,
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
  tempSelectedCategories: string[];
  onSave?: (selected: string[]) => Promise<void> | void;
  maxSelected?: number;
  title?: string;
}

export default function CategoryDialog({
  isModalOpen,
  closeModal,
  tempSelectedCategories,
  onSave,
  maxSelected,
  title = "Select Your Preferences",
}: CategoryDialogProps) {
  /** Local working copy để user chọn trong dialog */
  const [localSelected, setLocalSelected] = React.useState<string[]>([]);
  /** ô search */
  const [searchTerm, setSearchTerm] = React.useState("");
  /** saving spinner */
  const [isSaving, setIsSaving] = React.useState(false);
  /** lỗi khi save */
  const [error, setError] = React.useState<string | null>(null);

  /**
   * Khi modal mở lại, đồng bộ localSelected theo tempSelectedCategories từ parent.
   * Giúp user thấy trạng thái mới nhất của selections bên ngoài.
   */
  React.useEffect(() => {
    if (isModalOpen) {
      setLocalSelected(tempSelectedCategories ?? []);
      setSearchTerm("");
      setError(null);
    }
  }, [isModalOpen, tempSelectedCategories]);

  /** Lọc categories theo search */
  const filteredCategories = React.useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return categories;
    return categories.filter((c) => {
      const name = c.name?.toLowerCase() ?? "";
      const desc = c.description?.toLowerCase() ?? "";
      return name.includes(term) || desc.includes(term);
    });
  }, [searchTerm]);

  /** Xoá khỏi localSelected */
  const removeCategory = (id: string) => {
    setLocalSelected((prev) => prev.filter((x) => x !== id));
  };

  /** Toggle chọn/bỏ */
  const toggleCategory = (id: string) => {
    setLocalSelected((prev) => {
      const exists = prev.includes(id);
      if (exists) return prev.filter((x) => x !== id);

      // enforce maxSelected nếu có
      if (maxSelected && prev.length >= maxSelected) {
        // Có thể hiện toast, hoặc flash lỗi cục bộ
        setError(`You can select up to ${maxSelected} categories.`);
        return prev;
      }

      return [...prev, id];
    });
  };

  /** Save handler */
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

  /** count hiển thị (dùng local để người dùng thấy số lượng khi đang chỉnh sửa) */
  const count = localSelected.length;

  return (
    <Dialog
      open={isModalOpen}
      onOpenChange={(open) => {
        if (!open) closeModal();
      }}
    >
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Dialog Header */}
        <DialogHeader>
          <DialogTitle>
            {title}
            <span className="ml-2 bg-primary text-white text-xs px-2 py-1 rounded-full">
              {count}
            </span>
          </DialogTitle>
          {maxSelected ? (
            <p className="text-xs text-muted-foreground mt-1">
              You can select up to {maxSelected} categories.
            </p>
          ) : null}
        </DialogHeader>

        {/* Dialog Content */}
        <div className="flex-1 overflow-y-auto space-y-6 px-1">
          {/* Selected Categories Preview */}
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

          {/* Search */}
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

          {/* Categories Grid */}
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

        {/* Error (nếu có) */}
        {error && (
          <div className="px-1 text-sm text-destructive text-center">
            {error}
          </div>
        )}

        {/* Dialog Footer */}
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
