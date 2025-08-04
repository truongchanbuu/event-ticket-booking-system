import { useStatusInfo } from "@/hooks/use-info-hook";
import clsx from "clsx";

type ApplicationStatusHeaderProps = {
  applicationId: string;
  submittedAt: string;
  statusInfo: ReturnType<ReturnType<typeof useStatusInfo>["getStatusInfo"]>;
  organizerType: string;
};

export const ApplicationStatusHeader: React.FC<
  ApplicationStatusHeaderProps
> = ({ applicationId, submittedAt, statusInfo, organizerType }) => {
  const StatusIcon = statusInfo.icon;
  return (
    <div className="mb-8 bg-white rounded-lg p-6 shadow-sm border">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            My Application
          </h1>
          <p className="text-gray-600">
            Application Code:{" "}
            <span className="font-mono font-medium text-gray-800">
              {applicationId}
            </span>
          </p>
          <p className="text-sm text-gray-500">
            Submitted At: {new Date(submittedAt).toLocaleString("vi-VN")}
          </p>
        </div>
        <div className="text-right">
          <div
            className={clsx(
              "inline-flex items-center space-x-2 px-4 py-2 rounded-full text-sm font-medium border mb-2",
              statusInfo.color
            )}
          >
            <StatusIcon className="w-4 h-4" />
            <span>{statusInfo.text}</span>
          </div>
          <div className="text-xs text-gray-500">
            Organizer Type:{" "}
            {organizerType === "business" ? "Business" : "Personal"}
          </div>
        </div>
      </div>
      <div
        className={clsx(
          "p-4 rounded-lg border-l-4",
          statusInfo.color
            .replace("bg-", "border-")
            .replace("-100", "-400")
            .replace("-200", "-400")
            .replace("-50", "-300")
        )}
      >
        <p className="text-sm text-gray-700">{statusInfo.description}</p>
        {statusInfo?.reason && (
          <p className="text-sm text-red-500 font-bold">
            Reason: {statusInfo.reason}
          </p>
        )}
      </div>
    </div>
  );
};
