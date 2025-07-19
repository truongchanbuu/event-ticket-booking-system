"use client";

import React, { useState } from "react";
import {
  ArrowLeft,
  Eye,
  Home,
  Mail,
  Phone,
  MessageCircle,
  Edit3,
  Calendar,
  User,
  Building,
  Globe,
  Facebook,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  FileText,
  Badge,
} from "lucide-react";

// Mock data based on your schema
const mockApplications = [
  {
    applicationID: "oa_xyz789",
    userID: "abc123",
    applyType: "business",
    orgName: "CoderHub",
    description:
      "Chuyên tổ chức hội thảo công nghệ và các sự kiện về lập trình.",
    kycInfo: {
      fullName: "Nguyễn Văn A",
      idNumber: "123456789",
      dob: "1995-01-01",
      idIssueDate: "2015-05-01",
      idIssuedBy: "Công an TPHCM",
    },
    optionalInfo: {
      websiteUrl: "https://coderhub.vn",
      facebookUrl: "https://facebook.com/coderhub",
    },
    status: "approved",
    rejectionReason: null,
    requiresAdminApproval: false,
    rejectCount: 0,
    lastRejectedAt: null,
    cooldownUntil: null,
    createdAt: "2024-01-15T08:30:00Z",
    updatedAt: "2024-01-20T14:45:00Z",
    reviewedBy: "admin_123",
    reviewedAt: "2024-01-20T14:45:00Z",
  },
  {
    applicationID: "oa_abc456",
    userID: "def456",
    applyType: "individual",
    orgName: "TechMeet Saigon",
    description: "Tổ chức các buổi gặp mặt công nghệ hàng tháng tại TP.HCM.",
    kycInfo: {
      fullName: "Trần Thị B",
      idNumber: "987654321",
      dob: "1990-05-15",
      idIssueDate: "2018-03-10",
      idIssuedBy: "Công an Quận 1",
    },
    optionalInfo: {
      websiteUrl: "",
      facebookUrl: "https://facebook.com/techmeet.saigon",
    },
    status: "pending",
    rejectionReason: null,
    requiresAdminApproval: true,
    rejectCount: 0,
    lastRejectedAt: null,
    cooldownUntil: null,
    createdAt: "2024-02-01T10:15:00Z",
    updatedAt: "2024-02-01T10:15:00Z",
    reviewedBy: null,
    reviewedAt: null,
  },
  {
    applicationID: "oa_def123",
    userID: "ghi789",
    applyType: "business",
    orgName: "DevCon Vietnam",
    description: "Hội nghị phát triển phần mềm lớn nhất Việt Nam.",
    kycInfo: {
      fullName: "Lê Văn C",
      idNumber: "456789123",
      dob: "1988-12-22",
      idIssueDate: "2020-01-05",
      idIssuedBy: "Công an Hà Nội",
    },
    optionalInfo: {
      websiteUrl: "https://devcon.vn",
      facebookUrl: "",
    },
    status: "rejected",
    rejectionReason:
      "Giấy tờ không đầy đủ, cần bổ sung thêm giấy phép kinh doanh",
    requiresAdminApproval: true,
    rejectCount: 1,
    lastRejectedAt: "2024-01-25T16:20:00Z",
    cooldownUntil: "2024-02-25T16:20:00Z",
    createdAt: "2024-01-20T09:00:00Z",
    updatedAt: "2024-01-25T16:20:00Z",
    reviewedBy: "admin_456",
    reviewedAt: "2024-01-25T16:20:00Z",
  },
];

const getStatusColor = (status) => {
  switch (status) {
    case "approved":
      return "bg-green-100 text-green-800 border-green-200";
    case "pending":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "rejected":
      return "bg-red-100 text-red-800 border-red-200";
    case "permanent_rejected":
      return "bg-gray-100 text-gray-800 border-gray-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
};

const getStatusIcon = (status) => {
  switch (status) {
    case "approved":
      return <CheckCircle className="w-4 h-4" />;
    case "pending":
      return <Clock className="w-4 h-4" />;
    case "rejected":
      return <XCircle className="w-4 h-4" />;
    case "permanent_rejected":
      return <AlertTriangle className="w-4 h-4" />;
    default:
      return <Clock className="w-4 h-4" />;
  }
};

const formatDate = (dateString) => {
  if (!dateString) return "N/A";
  return new Date(dateString).toLocaleDateString("vi-VN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const ApplicationCard = ({ application, onViewApplication }) => {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-all duration-300 hover:border-blue-300">
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-xl font-semibold text-gray-900">
              {application.orgName}
            </h3>
            <div
              className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(application.status)}`}
            >
              {getStatusIcon(application.status)}
              {application.status === "permanent_rejected"
                ? "Từ chối vĩnh viễn"
                : application.status === "rejected"
                  ? "Bị từ chối"
                  : application.status === "approved"
                    ? "Đã duyệt"
                    : "Đang chờ"}
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
            <div className="flex items-center gap-1">
              {application.applyType === "business" ? (
                <Building className="w-4 h-4" />
              ) : (
                <User className="w-4 h-4" />
              )}
              {application.applyType === "business"
                ? "Doanh nghiệp"
                : "Cá nhân"}
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {formatDate(application.createdAt)}
            </div>
          </div>
          <p className="text-gray-700 mb-4 line-clamp-2">
            {application.description}
          </p>

          {application.status === "rejected" && application.rejectionReason && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
              <div className="flex items-start gap-2">
                <XCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-red-800">
                    Lý do từ chối:
                  </p>
                  <p className="text-sm text-red-700">
                    {application.rejectionReason}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 justify-end">
        <button
          onClick={() => onViewApplication(application)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          <Eye className="w-4 h-4" />
          Xem chi tiết
        </button>
      </div>
    </div>
  );
};

const ApplicationDetail = ({ application, onBack, onEdit }) => {
  const canEdit = application.status !== "approved";

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Quay lại
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {application.orgName}
              </h1>
              <p className="text-gray-600">ID: {application.applicationID}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border ${getStatusColor(application.status)}`}
            >
              {getStatusIcon(application.status)}
              {application.status === "permanent_rejected"
                ? "Từ chối vĩnh viễn"
                : application.status === "rejected"
                  ? "Bị từ chối"
                  : application.status === "approved"
                    ? "Đã duyệt"
                    : "Đang chờ duyệt"}
            </div>
            {canEdit && (
              <button
                onClick={() => onEdit(application)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
              >
                <Edit3 className="w-4 h-4" />
                Chỉnh sửa
              </button>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2">
          <button className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            <Home className="w-4 h-4" />
            Về trang chủ
          </button>
          <button className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            <Mail className="w-4 h-4" />
            Email admin
          </button>
          <button className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            <Phone className="w-4 h-4" />
            Gọi hỗ trợ
          </button>
          <button className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            <MessageCircle className="w-4 h-4" />
            Chat với admin
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Basic Information */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Thông tin cơ bản
          </h2>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-600">
                Loại đăng ký
              </label>
              <div className="flex items-center gap-2 mt-1">
                {application.applyType === "business" ? (
                  <Building className="w-4 h-4" />
                ) : (
                  <User className="w-4 h-4" />
                )}
                <span className="text-gray-900">
                  {application.applyType === "business"
                    ? "Doanh nghiệp"
                    : "Cá nhân"}
                </span>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">
                Tên tổ chức
              </label>
              <p className="text-gray-900 mt-1">{application.orgName}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Mô tả</label>
              <p className="text-gray-900 mt-1">{application.description}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">
                Ngày tạo
              </label>
              <p className="text-gray-900 mt-1">
                {formatDate(application.createdAt)}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">
                Cập nhật lần cuối
              </label>
              <p className="text-gray-900 mt-1">
                {formatDate(application.updatedAt)}
              </p>
            </div>
          </div>
        </div>

        {/* KYC Information */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Badge className="w-5 h-5" />
            Thông tin KYC
          </h2>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-600">
                Họ và tên
              </label>
              <p className="text-gray-900 mt-1">
                {application.kycInfo.fullName}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">
                Số CMND/CCCD
              </label>
              <p className="text-gray-900 mt-1">
                {application.kycInfo.idNumber}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">
                Ngày sinh
              </label>
              <p className="text-gray-900 mt-1">
                {new Date(application.kycInfo.dob).toLocaleDateString("vi-VN")}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">
                Ngày cấp
              </label>
              <p className="text-gray-900 mt-1">
                {new Date(application.kycInfo.idIssueDate).toLocaleDateString(
                  "vi-VN"
                )}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">
                Nơi cấp
              </label>
              <p className="text-gray-900 mt-1">
                {application.kycInfo.idIssuedBy}
              </p>
            </div>
          </div>
        </div>

        {/* Optional Information */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Globe className="w-5 h-5" />
            Thông tin bổ sung
          </h2>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-600">
                Website
              </label>
              {application.optionalInfo.websiteUrl ? (
                <a
                  href={application.optionalInfo.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 mt-1 block break-all"
                >
                  {application.optionalInfo.websiteUrl}
                </a>
              ) : (
                <p className="text-gray-500 mt-1">Chưa cung cấp</p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">
                Facebook
              </label>
              {application.optionalInfo.facebookUrl ? (
                <a
                  href={application.optionalInfo.facebookUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 mt-1 block break-all flex items-center gap-2"
                >
                  <Facebook className="w-4 h-4" />
                  {application.optionalInfo.facebookUrl}
                </a>
              ) : (
                <p className="text-gray-500 mt-1">Chưa cung cấp</p>
              )}
            </div>
          </div>
        </div>

        {/* Status Information */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            Trạng thái xử lý
          </h2>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-600">
                Trạng thái hiện tại
              </label>
              <div
                className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium border mt-1 ${getStatusColor(application.status)}`}
              >
                {getStatusIcon(application.status)}
                {application.status === "permanent_rejected"
                  ? "Từ chối vĩnh viễn"
                  : application.status === "rejected"
                    ? "Bị từ chối"
                    : application.status === "approved"
                      ? "Đã duyệt"
                      : "Đang chờ duyệt"}
              </div>
            </div>

            {application.rejectionReason && (
              <div>
                <label className="text-sm font-medium text-gray-600">
                  Lý do từ chối
                </label>
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 mt-1">
                  <p className="text-red-800 text-sm">
                    {application.rejectionReason}
                  </p>
                </div>
              </div>
            )}

            <div>
              <label className="text-sm font-medium text-gray-600">
                Số lần bị từ chối
              </label>
              <p className="text-gray-900 mt-1">{application.rejectCount}</p>
            </div>

            {application.reviewedBy && (
              <>
                <div>
                  <label className="text-sm font-medium text-gray-600">
                    Được xử lý bởi
                  </label>
                  <p className="text-gray-900 mt-1">{application.reviewedBy}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">
                    Thời gian xử lý
                  </label>
                  <p className="text-gray-900 mt-1">
                    {formatDate(application.reviewedAt)}
                  </p>
                </div>
              </>
            )}

            {application.cooldownUntil && (
              <div>
                <label className="text-sm font-medium text-gray-600">
                  Cooldown đến
                </label>
                <p className="text-red-600 mt-1">
                  {formatDate(application.cooldownUntil)}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default function OrganizerApplicationUI() {
  const [currentView, setCurrentView] = useState("list"); // 'list' or 'detail'
  const [selectedApplication, setSelectedApplication] = useState(null);

  const handleViewApplication = (application) => {
    setSelectedApplication(application);
    setCurrentView("detail");
  };

  const handleBack = () => {
    setCurrentView("list");
    setSelectedApplication(null);
  };

  const handleEdit = (application) => {
    // This would typically redirect to an edit form
    alert(`Chỉnh sửa đơn đăng ký: ${application.orgName}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {currentView === "list" ? (
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Quản lý đơn đăng ký Organizer
            </h1>
            <p className="text-gray-600">
              Xem và quản lý các đơn đăng ký tổ chức sự kiện
            </p>
          </div>

          {/* Applications Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {mockApplications.map((application) => (
              <ApplicationCard
                key={application.applicationID}
                application={application}
                onViewApplication={handleViewApplication}
              />
            ))}
          </div>
        </div>
      ) : (
        <ApplicationDetail
          application={selectedApplication}
          onBack={handleBack}
          onEdit={handleEdit}
        />
      )}
    </div>
  );
}
