import { z } from "zod";

export const urlOrDomainField = (label: string, optional = true) =>
  z.preprocess(
    (val) => {
      if (typeof val !== "string") return val;
      const trimmed = val.trim();
      if (trimmed === "") return undefined; // ✅ biến chuỗi trắng thành undefined
      if (!/^https?:\/\//i.test(trimmed)) {
        return `https://${trimmed}`;
      }
      return trimmed;
    },
    (() => {
      const base = z
        .string()
        .url(`Invalid ${label}`)
        .refine(
          (val) => {
            try {
              const host = new URL(val).hostname;
              return (
                !host.startsWith(".") &&
                !host.endsWith(".") &&
                host.includes(".") &&
                /^[a-zA-Z0-9.-]+$/.test(host)
              );
            } catch {
              return false;
            }
          },
          {
            message: `${label} must be a valid domain like example.com`,
          }
        );
      return optional ? base.optional() : base;
    })()
  );
