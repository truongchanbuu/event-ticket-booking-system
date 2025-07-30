import { ChevronDown, ChevronUp, Edit3, Save, X, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "../ui/button";

type SectionCardProps = {
  title: string;
  icon: React.ElementType;
  count?: number;
  isExpanded: boolean;
  onToggle: () => void;
  badge?: React.ReactNode;
  children: React.ReactNode;
  // Edit mode props
  canEdit?: boolean;
  isEditing?: boolean;
  onEditToggle?: () => void;
  onSave?: () => void;
  onCancel?: () => void;
  hasUnsavedChanges?: boolean;
  isLoading?: boolean;
};

export const SectionCard: React.FC<SectionCardProps> = ({
  title,
  icon: Icon,
  count,
  isExpanded,
  onToggle,
  badge,
  children,
  canEdit = false,
  isEditing = false,
  onEditToggle,
  onSave,
  onCancel,
  hasUnsavedChanges = false,
  isLoading = false,
}) => {
  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEditToggle?.();
  };

  const handleSaveClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSave?.();
  };

  const handleCancelClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onCancel?.();
  };

  return (
    <motion.div
      className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm"
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      <div
        className={`flex items-center justify-between p-4 border-b cursor-pointer transition-colors ${
          isEditing
            ? "bg-blue-50 border-blue-200"
            : "bg-gray-50 hover:bg-gray-100"
        }`}
        onClick={onToggle}
      >
        <div className="flex items-center space-x-3">
          <div
            className={`p-2 text-white rounded-lg shadow-sm transition-colors ${
              isEditing ? "bg-blue-600" : "bg-blue-500"
            }`}
          >
            <Icon size={18} />
          </div>
          <h3 className="font-semibold text-gray-900">{title}</h3>
          {count !== undefined && count > 0 && (
            <span
              className={`px-2 py-1 text-xs rounded-full font-medium transition-colors ${
                isEditing
                  ? "bg-blue-200 text-blue-900"
                  : "bg-blue-100 text-blue-800"
              }`}
            >
              {count}
            </span>
          )}
          {badge}
          {/* Edit Mode Indicator */}
          {isEditing && (
            <motion.span
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="px-2 py-1 text-xs bg-orange-100 text-orange-800 rounded-full font-medium"
            >
              Editing
            </motion.span>
          )}
          {/* Unsaved Changes Indicator */}
          {hasUnsavedChanges && !isLoading && (
            <motion.span
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-2 h-2 bg-orange-500 rounded-full"
              title="Unsaved changes"
            />
          )}
        </div>

        <div className="flex items-center space-x-2">
          {/* Edit Controls */}
          {canEdit && isExpanded && (
            <div className="flex items-center space-x-1 mr-2">
              {!isEditing ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleEditClick}
                  className="h-8 px-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                  title="Edit section"
                >
                  <Edit3 className="w-4 h-4" />
                </Button>
              ) : (
                <div className="flex items-center space-x-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSaveClick}
                    disabled={isLoading}
                    className="h-8 px-2 text-green-600 hover:text-green-700 hover:bg-green-50 transition-colors disabled:opacity-50"
                    title="Save changes"
                  >
                    {isLoading ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{
                          duration: 1,
                          repeat: Infinity,
                          ease: "linear",
                        }}
                        className="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full"
                      />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCancelClick}
                    disabled={isLoading}
                    className="h-8 px-2 text-red-600 hover:text-red-700 hover:bg-red-50 transition-colors disabled:opacity-50"
                    title="Cancel editing"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Expand/Collapse Arrow */}
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-gray-500" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-500" />
          )}
        </div>
      </div>

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.section
            key="content"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="p-5 overflow-hidden"
          >
            <div
              className={`transition-colors ${
                isEditing ? "bg-blue-50/30" : "bg-white"
              }`}
            >
              {children}
            </div>
          </motion.section>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
