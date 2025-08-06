export const ProgressBar = ({
  current,
  total,
}: {
  current: number;
  total: number;
}) => {
  const percentage = total > 0 ? (current / total) * 100 : 0;

  return (
    <div className="w-full bg-gray-200 rounded-full h-2">
      <div
        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
        style={{ width: `${Math.min(percentage, 100)}%` }}
      ></div>
    </div>
  );
};
