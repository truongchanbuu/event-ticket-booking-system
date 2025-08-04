import clsx from "clsx";

type InfoRowProps = {
  label: string;
  value?: string | React.ReactNode;
  icon?: React.ElementType;
  children?: React.ReactNode;
  className?: string;
};

export const InfoRow: React.FC<InfoRowProps> = ({
  label,
  value,
  icon: Icon,
  children,
  className,
}) => (
  <div className={clsx("py-3", className)}>
    <div className="flex items-start gap-4">
      {Icon && (
        <div className="pt-1">
          <Icon className="w-5 h-5 text-gray-400" />
        </div>
      )}
      <dl className="flex-1">
        <dt className="text-sm font-medium text-gray-500 mb-1">{label}</dt>
        <dd className="text-sm text-gray-900 break-words">
          {children || value || (
            <span className="text-gray-400 italic">Not Provided</span>
          )}
        </dd>
      </dl>
    </div>
  </div>
);
