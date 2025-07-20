import { z } from "zod";

export const urlOrDomainField = (label: string) =>
  z
    .preprocess(
      (val) => {
        if (typeof val !== "string") return val;
        const trimmed = val.trim();
        if (trimmed === "") return undefined;
        if (!/^https?:\/\//i.test(trimmed)) {
          return `https://${trimmed}`;
        }
        return trimmed;
      },
      z.string().url(`Invalid ${label}`)
    )
    .optional();
