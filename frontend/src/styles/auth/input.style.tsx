import ClassNameHelper from "@/helpers/ClassNameHelper"

const INPUT_CLASSES = {
  layout: "mb-2 w-full min-w-xs max-w-sm px-2 py-3",
  border: "border border-gray-300 rounded-md",
  focus: "focus:border-blue-500 focus:outline-none",
  caret: "caret-blue-500",
}

export default ClassNameHelper.getDefaultClasses(INPUT_CLASSES)
