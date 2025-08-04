import { zodResolver } from "@hookform/resolvers/zod";
import React from "react";
import {
  FieldValues,
  useForm,
  UseFormReturn,
  DefaultValues,
  Path,
} from "react-hook-form";
import { z } from "zod";

type StepSchema<TValues extends FieldValues> =
  | z.ZodTypeAny
  | ((getValues: () => TValues) => z.ZodTypeAny);

interface UseWizardFormOptions<TValues extends FieldValues> {
  /** Mảng các schema cho từng bước (hoặc hàm tạo schema) */
  stepSchemas: StepSchema<TValues>[];
  /** (Tùy chọn) Schema tổng thể để validate lần cuối khi submit */
  fullSchema?: z.ZodTypeAny;
  /** Giá trị mặc định cho tất cả các trường */
  defaultValues: DefaultValues<TValues>;
  /** Chế độ của React Hook Form */
  mode?: "onChange" | "onBlur" | "onSubmit" | "onTouched" | "all";
}

// === CẬP NHẬT INTERFACE TRẢ VỀ ===
export interface WizardReturn<TValues extends FieldValues> {
  methods: UseFormReturn<TValues>;
  currentStep: number;
  previousStep?: number;
  isFirst: boolean;
  isLast: boolean;
  goNext: () => Promise<void>;
  goPrev: () => void;
  totalSteps: number;
  submitAll: (
    cb: (data: TValues) => void | Promise<void>
  ) => (e?: React.BaseSyntheticEvent) => Promise<void>;
  currentSchema: z.ZodTypeAny;
}

export function useWizardForm<TValues extends FieldValues>({
  stepSchemas,
  fullSchema,
  defaultValues,
  mode = "onChange",
}: UseWizardFormOptions<TValues>): WizardReturn<TValues> {
  // === THÊM STATE ĐỂ LƯU CẢ BƯỚC TRƯỚC ĐÓ ===
  const [step, setStep] = React.useState({
    current: 0,
    previous: undefined as number | undefined,
  });

  const resolver = React.useCallback(
    async (data: TValues, context: any, options: any) => {
      const schemaOrFn = stepSchemas[step.current];
      const currentSchema =
        typeof schemaOrFn === "function" ? schemaOrFn(() => data) : schemaOrFn;

      return zodResolver(currentSchema)(data, context, options);
    },
    [step.current, stepSchemas]
  );

  const methods = useForm<TValues>({
    resolver,
    mode,
    defaultValues,
    shouldUnregister: false,
  });

  React.useEffect(() => {
    methods.trigger();
  }, [step.current, methods]);

  const currentSchema = React.useMemo(() => {
    const schemaOrFn = stepSchemas[step.current];
    return typeof schemaOrFn === "function"
      ? schemaOrFn(methods.getValues)
      : schemaOrFn;
  }, [step.current, stepSchemas, methods.getValues]);

  // === CẬP NHẬT `goNext` ===
  const goNext = React.useCallback(async () => {
    let fieldsToValidate: Path<TValues>[] | undefined = undefined;
    if (currentSchema instanceof z.ZodObject) {
      fieldsToValidate = Object.keys(currentSchema.shape) as Path<TValues>[];
    }
    const isValid = await methods.trigger(fieldsToValidate);

    if (isValid && step.current < stepSchemas.length - 1) {
      setStep((prev) => ({
        current: prev.current + 1,
        previous: prev.current, // Lưu lại bước hiện tại làm bước trước đó
      }));
    }
  }, [methods, step.current, stepSchemas.length, currentSchema]);

  // === CẬP NHẬT `goPrev` ===
  const goPrev = React.useCallback(() => {
    if (step.current > 0) {
      setStep((prev) => ({
        current: prev.current - 1,
        previous: prev.current,
      }));
    }
  }, [step.current]);

  const submitAll = (cb: (data: TValues) => void | Promise<void>) =>
    methods.handleSubmit(async (data) => {
      const freshData = methods.getValues();
      console.log("🔥 [submitAll] Raw form data:", freshData); // Log dữ liệu mới nhất
      const finalSchema =
        fullSchema ||
        z.object(
          stepSchemas.reduce((acc, s) => {
            const schema = typeof s === "function" ? s(() => freshData) : s;
            if (schema instanceof z.ZodObject) {
              return { ...acc, ...schema.shape };
            }
            return acc;
          }, {})
        );

      console.log("🔹 Using provided fullSchema for validation.");
      const parseResult = await finalSchema.safeParseAsync(freshData);

      if (!parseResult.success) {
        const flattenedErrors = parseResult.error.flatten();
        console.error("❌ Full schema validation failed:", flattenedErrors);

        parseResult.error.issues.forEach((issue) => {
          const path = issue.path.join(".") as Path<TValues>;
          const message = issue.message;
          console.warn(`⚠️ Setting error for "${path}": ${message}`);
          methods.setError(path, {
            type: "manual",
            message: message,
          });
        });
        return;
      }

      await cb(parseResult.data as TValues);
    });

  // === CẬP NHẬT OBJECT TRẢ VỀ ===
  return {
    methods,
    currentStep: step.current,
    previousStep: step.previous,
    isFirst: step.current === 0,
    isLast: step.current === stepSchemas.length - 1,
    goNext,
    goPrev,
    totalSteps: stepSchemas.length,
    submitAll,
    currentSchema,
  };
}
