export const toUpperCaseFirstLetter = (str: string) => {
  const trimmed = str.trim();
  if (!trimmed) return "";
  return `${trimmed.charAt(0).toUpperCase()}${trimmed.slice(1)}`;
};
