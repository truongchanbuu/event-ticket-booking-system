interface ProfileSectionProps {
  title: React.ReactNode;
  icon: React.ElementType;
  children?: React.ReactNode;
  suffix?: React.ReactNode;
}

export const ProfileSection: React.FC<ProfileSectionProps> = ({
  title,
  icon: Icon,
  suffix,
  children,
}) => (
  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
    <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
      <Icon className="w-5 h-5" />
      {title}
      {suffix && <span className="ml-auto">{suffix}</span>}
    </h2>
    {children}
  </div>
);
