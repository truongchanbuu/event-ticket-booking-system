import React from "react";
import { motion } from "framer-motion";
import { Radio, Loader2 } from "lucide-react";
import DocumentUploader from "./DocumentUploader";

export type OrganizerType = "personal" | "business";

interface ApplyOrganizerFormProps {
  onSubmit: (data: {
    type: OrganizerType;
    cccdFront: File;
    cccdBack: File;
    businessLicense?: File;
    eventLicense?: File;
  }) => void | Promise<void>;
  loading?: boolean;
  defaultType?: OrganizerType;
}

export const ApplyOrganizerForm: React.FC<ApplyOrganizerFormProps> = ({
  onSubmit,
  loading,
  defaultType = "personal",
}) => {
  const [type, setType] = React.useState<OrganizerType>(defaultType);
  const [cccdFront, setCccdFront] = React.useState<File | null>(null);
  const [cccdBack, setCccdBack] = React.useState<File | null>(null);
  const [businessLicense, setBusinessLicense] = React.useState<File | null>(
    null
  );
  const [eventLicense, setEventLicense] = React.useState<File | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cccdFront || !cccdBack) {
      setError("Vui lòng upload đủ ảnh CCCD mặt trước và mặt sau.");
      return;
    }
    if (type === "business" && !businessLicense) {
      setError("Vui lòng upload Giấy phép Kinh doanh.");
      return;
    }
    setError(null);
    onSubmit({
      type,
      cccdFront,
      cccdBack,
      businessLicense: type === "business" ? businessLicense! : undefined,
      eventLicense: eventLicense || undefined,
    });
  };

  return (
    <motion.form
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      onSubmit={handleSubmit}
      className="space-y-6 max-w-lg mx-auto bg-white p-6 rounded-lg shadow"
    >
      <div>
        <label className="block font-medium mb-2">
          Loại tổ chức <span className="text-red-500">*</span>
        </label>
        <div className="flex gap-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="type"
              value="personal"
              checked={type === "personal"}
              onChange={() => setType("personal")}
              className="accent-blue-500"
            />
            Cá nhân
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="type"
              value="business"
              checked={type === "business"}
              onChange={() => setType("business")}
              className="accent-blue-500"
            />
            Doanh nghiệp
          </label>
        </div>
      </div>
      <DocumentUploader
        label="Ảnh CCCD mặt trước"
        required
        value={cccdFront}
        onChange={setCccdFront}
      />
      <DocumentUploader
        label="Ảnh CCCD mặt sau"
        required
        value={cccdBack}
        onChange={setCccdBack}
      />
      {type === "business" && (
        <DocumentUploader
          label="Giấy phép Kinh doanh"
          required
          value={businessLicense}
          onChange={setBusinessLicense}
        />
      )}
      <DocumentUploader
        label="Giấy phép tổ chức sự kiện (không bắt buộc)"
        value={eventLicense}
        onChange={setEventLicense}
      />
      {error && <div className="text-red-500 text-sm">{error}</div>}
      <button
        type="submit"
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition disabled:opacity-60"
      >
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        Gửi đăng ký
      </button>
    </motion.form>
  );
};

export default ApplyOrganizerForm;
