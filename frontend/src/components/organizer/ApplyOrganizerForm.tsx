import React from "react";
import { motion } from "framer-motion";
import { Radio, Loader2 } from "lucide-react";
import DocumentUploader from "./DocumentUploader";

export type OrganizerType = "personal" | "business";

interface ApplyOrganizerFormProps {
  onSubmit: (data: {
    type: OrganizerType;
    identityCardFront: File;
    identityCardBack: File;
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
  const [identityCardFront, setIdentityCardFront] = React.useState<File | null>(
    null
  );
  const [identityCardBack, setIdentityCardBack] = React.useState<File | null>(
    null
  );
  const [businessLicense, setBusinessLicense] = React.useState<File | null>(
    null
  );
  const [eventLicense, setEventLicense] = React.useState<File | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!identityCardFront || !identityCardBack) {
      setError("Please upload both front and back of your Identity Card.");
      return;
    }
    if (type === "business" && !businessLicense) {
      setError("Please upload business license.");
      return;
    }
    setError(null);
    onSubmit({
      type,
      identityCardFront,
      identityCardBack,
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
          Type of organization <span className="text-red-500">*</span>
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
            Personal
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
            Business
          </label>
        </div>
      </div>
      <DocumentUploader
        label="Front of your Identity Card"
        required
        value={identityCardFront}
        onChange={setIdentityCardFront}
      />
      <DocumentUploader
        label="Back of your Identity Card"
        required
        value={identityCardBack}
        onChange={setIdentityCardBack}
      />
      {type === "business" && (
        <DocumentUploader
          label="Business License"
          required
          value={businessLicense}
          onChange={setBusinessLicense}
        />
      )}
      <DocumentUploader
        label="Event organization permit (optional)"
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
        Submit
      </button>
    </motion.form>
  );
};

export default ApplyOrganizerForm;
