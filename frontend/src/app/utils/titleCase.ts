export const toTitleCase = (value: string) => {
  if (!value || typeof value !== "string") {
    return "";
  }
  return value
    .trim()
    .replace(/-/g, " ") // Replace hyphens with whitespaces
    .toLowerCase()
    .replace(/\b[a-z]/g, (char) => char.toUpperCase()); // Capitalize first letter of each word
};
