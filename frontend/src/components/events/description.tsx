"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

export const EventDescription = ({
  description = "",
  lineClamp = 5,
  isHtml = true,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!description.trim()) {
    return (
      <div className="max-w-none">
        <h2 className="text-xl font-semibold mb-4 text-gray-800 flex items-center gap-2">
          <div className="w-1 h-6 bg-gradient-to-b from-blue-500 to-purple-500 rounded-full"></div>
          Description
        </h2>
        <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-lg p-8 text-center">
          <p className="text-gray-500 italic">No description provided</p>
        </div>
      </div>
    );
  }

  const contentStyle: React.CSSProperties = !isExpanded
    ? {
        display: "-webkit-box",
        WebkitBoxOrient: "vertical",
        WebkitLineClamp: lineClamp,
        overflow: "hidden",
      }
    : {};

  if (!description.trim()) {
    return (
      <div className="prose prose-gray max-w-none">
        <h2 className="text-xl font-semibold mb-4 text-gray-800 flex items-center gap-2">
          <div className="w-1 h-6 bg-gradient-to-b from-blue-500 to-purple-500 rounded-full"></div>
          Description
        </h2>
        <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-lg p-8 text-center">
          <p className="text-gray-500 italic">No description provided</p>
        </div>
      </div>
    );
  }

  return (
    <div className="prose prose-gray max-w-none">
      <h2 className="text-xl font-semibold mb-4 text-gray-800 flex items-center gap-2">
        <div className="w-1 h-6 bg-gradient-to-b from-blue-500 to-purple-500 rounded-full"></div>
        Description
      </h2>

      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow duration-200">
        {isHtml ? (
          <div
            className="prose prose-gray max-w-none text-gray-700 leading-relaxed break-words"
            dangerouslySetInnerHTML={{ __html: description }}
            style={contentStyle}
          />
        ) : (
          <div
            className="whitespace-pre-wrap text-gray-700 leading-relaxed"
            style={contentStyle}
          >
            {description}
          </div>
        )}

        {/* Luôn hiển thị nút "Show More" nếu cần, không cần check độ dài nữa */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors duration-200 group"
          >
            {isExpanded ? (
              <>
                <span>Show Less</span>
                <ChevronUp className="w-4 h-4 group-hover:translate-y-[-2px] transition-transform duration-200" />
              </>
            ) : (
              <>
                <span>Show More</span>
                <ChevronDown className="w-4 h-4 group-hover:translate-y-[2px] transition-transform duration-200" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
