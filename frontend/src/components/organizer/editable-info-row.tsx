import { useState, useEffect } from "react";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";

type EditableInfoRowProps = {
  label: string;
  value: string | string[] | null | undefined;
  icon?: React.ElementType;
  isEditing?: boolean;
  onChange?: (value: string | string[]) => void;
  type?:
    | "text"
    | "email"
    | "url"
    | "tel"
    | "date"
    | "textarea"
    | "tags"
    | "select";
  options?: { label: string; value: string }[];
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
};

export const EditableInfoRow: React.FC<EditableInfoRowProps> = ({
  label,
  value,
  icon: Icon,
  isEditing = false,
  onChange,
  type = "text",
  options,
  placeholder,
  required = false,
  disabled = false,
  className = "",
}) => {
  const [localValue, setLocalValue] = useState(
    typeof value === "string" ? value : ""
  );

  useEffect(() => {
    if (typeof value === "string") {
      setLocalValue(value || "");
    }
  }, [value]);

  const handleChange = (newValue: string) => {
    setLocalValue(newValue);
    onChange?.(newValue);
  };

  const formatDisplayValue = (val: string | string[] | null | undefined) => {
    if (!val || (Array.isArray(val) && val.length === 0)) return "Not provided";

    if (type === "tags" && Array.isArray(val)) {
      return (
        <div className="flex flex-wrap gap-2">
          {val.map((tag, idx) => (
            <span
              key={idx}
              className="bg-gray-200 text-sm text-gray-700 px-2 py-1 rounded"
            >
              {tag}
            </span>
          ))}
        </div>
      );
    }

    if (type === "url" && typeof val === "string") {
      return (
        <a
          href={val.startsWith("http") ? val : `https://${val}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-800 underline"
        >
          {val}
        </a>
      );
    }

    if (type === "email" && typeof val === "string") {
      return (
        <a
          href={`mailto:${val}`}
          className="text-blue-600 hover:text-blue-800 underline"
        >
          {val}
        </a>
      );
    }

    return val;
  };

  return (
    <div className={`${className}`}>
      <dt className="text-md font-medium text-gray-500 mb-2 flex items-center">
        {Icon && <Icon className="w-4 h-4 mr-2 text-gray-400" />}
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </dt>
      <dd className="text-sm text-gray-900">
        {isEditing ? (
          type === "textarea" ? (
            <Textarea
              value={localValue}
              onChange={(e) => handleChange(e.target.value)}
              placeholder={placeholder || `Enter ${label.toLowerCase()}`}
              disabled={disabled}
              className="w-full min-h-[80px] resize-y border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              rows={3}
            />
          ) : type === "tags" ? (
            <TagsInput
              value={Array.isArray(value) ? value : []}
              onChange={onChange}
              disabled={disabled}
            />
          ) : type === "select" ? (
            <select
              value={localValue}
              onChange={(e) => handleChange(e.target.value)}
              disabled={disabled}
              className="w-full border-gray-300 focus:border-blue-500 focus:ring-blue-500 px-3 py-2 rounded"
            >
              <option value="">Select {label.toLowerCase()}</option>
              {options?.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          ) : (
            <Input
              type={type}
              value={localValue}
              onChange={(e) => handleChange(e.target.value)}
              placeholder={placeholder || `Enter ${label.toLowerCase()}`}
              disabled={disabled}
              className="w-full border-gray-300 focus:border-blue-500 focus:ring-blue-500"
            />
          )
        ) : (
          <div className="min-h-[40px] flex items-center flex-wrap gap-2">
            {formatDisplayValue(value)}
          </div>
        )}
      </dd>
    </div>
  );
};

const TagsInput = ({
  value,
  onChange,
  disabled,
}: {
  value: string[];
  onChange?: (val: string[]) => void;
  disabled?: boolean;
}) => {
  const [inputValue, setInputValue] = useState("");

  const handleAddTag = () => {
    const newTag = inputValue.trim();
    if (newTag && !value.includes(newTag)) {
      onChange?.([...value, newTag]);
      setInputValue("");
    }
  };

  const handleRemoveTag = (index: number) => {
    const newTags = [...value];
    newTags.splice(index, 1);
    onChange?.(newTags);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {value.map((tag, i) => (
        <div
          key={i}
          className="bg-blue-100 text-blue-800 text-sm px-2 py-1 rounded flex items-center gap-1"
        >
          {tag}
          {!disabled && (
            <button
              type="button"
              onClick={() => handleRemoveTag(i)}
              className="text-red-500 hover:text-red-700 text-xs ml-1"
            >
              ×
            </button>
          )}
        </div>
      ))}
      {!disabled && (
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAddTag();
            }
          }}
          placeholder="Add tag"
          className="border px-2 py-1 text-sm rounded w-36"
        />
      )}
    </div>
  );
};
