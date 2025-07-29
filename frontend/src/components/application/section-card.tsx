import { ChevronDown, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type SectionCardProps = {
  title: string;
  icon: React.ElementType;
  count?: number;
  isExpanded: boolean;
  onToggle: () => void;
  badge?: React.ReactNode;
  children: React.ReactNode;
};
export const SectionCard: React.FC<SectionCardProps> = ({
  title,
  icon: Icon,
  count,
  isExpanded,
  onToggle,
  badge,
  children,
}) => {
  return (
    <motion.div
      className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm"
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      <div
        className="flex items-center justify-between p-4 bg-gray-50 border-b cursor-pointer hover:bg-gray-100"
        onClick={onToggle}
      >
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-500 text-white rounded-lg shadow-sm">
            <Icon size={18} />
          </div>
          <h3 className="font-semibold text-gray-900">{title}</h3>
          {count !== undefined && count > 0 && (
            <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full font-medium">
              {count}
            </span>
          )}
          {badge}
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-gray-500" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-500" />
        )}
      </div>

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.section
            key="content"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="p-6">{children}</div>
          </motion.section>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
