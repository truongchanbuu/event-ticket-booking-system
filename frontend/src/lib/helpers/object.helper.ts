import diff from "microdiff";

export function getChangedFields<T extends object>(
  original: T,
  edited: T
): Partial<T> {
  const changes = diff(original, edited);
  const result: Partial<T> = {};

  for (const change of changes) {
    const key = change.path[0] as keyof T;

    if (!result.hasOwnProperty(key)) {
      result[key] = edited[key];
    }
  }

  return result;
}

export function cleanEmptyFields(obj: Record<string, any>) {
  return Object.fromEntries(
    Object.entries(obj).filter(([_, value]) => value !== "" && value !== null)
  );
}
