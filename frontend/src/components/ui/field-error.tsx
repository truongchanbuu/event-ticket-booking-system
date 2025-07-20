export const FieldError = ({
  message,
  isTouched,
}: {
  message?: string;
  isTouched?: boolean;
}) => {
  if (!isTouched || !message) return null;
  return <p className="mt-1.5 text-sm font-medium text-red-600">{message}</p>;
};
