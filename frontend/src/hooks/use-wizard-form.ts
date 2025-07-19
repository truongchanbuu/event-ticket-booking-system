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

// Kiểu dữ liệu cho một bước (có thể là schema hoặc hàm tạo schema)
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

interface WizardReturn<TValues extends FieldValues> {
  methods: UseFormReturn<TValues>;
  currentStep: number;
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
  const [currentStep, setCurrentStep] = React.useState(0);

  // --- GIẢI PHÁP NẰM Ở ĐÂY ---
  // Tạo một hàm resolver tùy chỉnh bằng useCallback.
  // Hàm này sẽ không thay đổi trừ khi stepSchemas thay đổi, nhưng logic bên trong
  // sẽ luôn sử dụng giá trị `currentStep` mới nhất.
  const resolver = React.useCallback(
    async (data: TValues, context: any, options: any) => {
      // 1. Xác định schema cho bước hiện tại
      const schemaOrFn = stepSchemas[currentStep];
      const currentSchema =
        typeof schemaOrFn === "function"
          ? // Chúng ta không thể dùng getValues() ở đây vì nó sẽ tạo vòng lặp.
            // Thay vào đó, chúng ta có thể truyền `data` hiện tại mà resolver nhận được.
            schemaOrFn(() => data)
          : schemaOrFn;

      // 2. Sử dụng zodResolver của thư viện với schema đã được xác định
      return zodResolver(currentSchema)(data, context, options);
    },
    [currentStep, stepSchemas]
  );

  // `methods` bây giờ được khai báo TRƯỚC khi cần dùng đến.
  // Nó nhận vào một hàm resolver ổn định.
  const methods = useForm<TValues>({
    resolver,
    mode,
    defaultValues,
  });

  // `currentSchema` giờ đây có thể được tính toán một cách an toàn SAU KHI `methods` đã tồn tại.
  const currentSchema = React.useMemo(() => {
    const schemaOrFn = stepSchemas[currentStep];
    return typeof schemaOrFn === "function"
      ? schemaOrFn(methods.getValues)
      : schemaOrFn;
  }, [currentStep, stepSchemas, methods.getValues]);

  const goNext = React.useCallback(async () => {
    let fieldsToValidate: Path<TValues>[] | undefined = undefined;
    if (currentSchema instanceof z.ZodObject) {
      fieldsToValidate = Object.keys(currentSchema.shape) as Path<TValues>[];
    }
    const isValid = await methods.trigger(fieldsToValidate);

    if (isValid && currentStep < stepSchemas.length - 1) {
      setCurrentStep((s) => s + 1);
    }
  }, [methods, currentStep, stepSchemas.length, currentSchema]);

  const goPrev = React.useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep((s) => s - 1);
    }
  }, [currentStep]);

  const submitAll = (cb: (data: TValues) => void | Promise<void>) =>
    methods.handleSubmit(async (data) => {
      const finalSchema =
        fullSchema ||
        z.object(
          stepSchemas.reduce((acc, s) => {
            const schema = typeof s === "function" ? s(() => data) : s;
            if (schema instanceof z.ZodObject) {
              return { ...acc, ...schema.shape };
            }
            return acc;
          }, {})
        );

      const parseResult = await finalSchema.safeParseAsync(data);

      if (!parseResult.success) {
        console.error(
          "Full schema validation failed:",
          parseResult.error.flatten()
        );
        parseResult.error.issues.forEach((issue) => {
          methods.setError(issue.path.join(".") as Path<TValues>, {
            type: "manual",
            message: issue.message,
          });
        });
        return;
      }
      await cb(parseResult.data as TValues);
    });

  return {
    methods,
    currentStep,
    isFirst: currentStep === 0,
    isLast: currentStep === stepSchemas.length - 1,
    goNext,
    goPrev,
    totalSteps: stepSchemas.length,
    submitAll,
    currentSchema,
  };
}
