"use client";

import React, { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Building2,
  CheckCircle,
  Clock,
  Filter,
  Package,
  Search,
  Users,
  ArchiveX,
} from "lucide-react";
import { Application } from "@/schema/application";
import ApplicationCard from "@/components/application/application-card";
import ApplicationCardSkeleton from "@/components/application/application-card-skeleton";
import { APPLY_STATUS } from "@/schema";
import { useAdminApplication } from "@/hooks/use-admin-application";

// Helper để hiển thị tên trạng thái thân thiện hơn
const statusLabels: { [key in APPLY_STATUS]: string } = {
  [APPLY_STATUS.NONE]: "No Status",
  [APPLY_STATUS.PENDING]: "Pending",
  [APPLY_STATUS.PROCESSING]: "Processing",
  [APPLY_STATUS.PENDING_ADMIN]: "Pending Admin",
  [APPLY_STATUS.EDITING]: "Editing",
  [APPLY_STATUS.LOCKED_BY_ADMIN]: "Locked by Admin",
  [APPLY_STATUS.APPROVED]: "Approved",
  [APPLY_STATUS.REJECTED]: "Rejected",
  [APPLY_STATUS.PERMANENT_REJECTED]: "Permanently Rejected",
  [APPLY_STATUS.CANCELLED]: "Cancelled",
};

export default function ApplicationManagementPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const {
    applicationsQuery,
    approve,
    reject,
    permanentReject,
    markProcessing,
  } = useAdminApplication({
    status: statusFilter === "all" ? undefined : statusFilter,
    limit: 20,
    sortBy: "submittedAt",
  });

  const { data: response, isLoading, isError, refetch } = applicationsQuery;

  const applications = useMemo(() => response?.data || [], [response]);
  const meta = useMemo(() => response?.meta, [response]);

  const statsData = useMemo(() => {
    const total = meta?.count || 0;

    const pendingReview = applications.filter((app) =>
      [APPLY_STATUS.PENDING, APPLY_STATUS.PENDING_ADMIN].includes(
        app.status as APPLY_STATUS
      )
    ).length;
    const approved = applications.filter(
      (app) => app.status === APPLY_STATUS.APPROVED
    ).length;
    const closedOrRejected = applications.filter((app) =>
      [
        APPLY_STATUS.REJECTED,
        APPLY_STATUS.PERMANENT_REJECTED,
        APPLY_STATUS.CANCELLED,
      ].includes(app.status as APPLY_STATUS)
    ).length;

    return [
      {
        title: "Total Applications",
        value: total,
        icon: Package,
        gradient: "from-blue-500 to-blue-400",
      },
      {
        title: "Pending Review",
        value: pendingReview,
        icon: Clock,
        gradient: "from-amber-500 to-amber-400",
      },
      {
        title: "Approved",
        value: approved,
        icon: CheckCircle,
        gradient: "from-emerald-500 to-emerald-400",
      },
      {
        title: "Rejected / Closed",
        value: closedOrRejected,
        icon: ArchiveX,
        gradient: "from-red-500 to-red-400",
      },
    ];
  }, [applications, meta]);

  // ✨ CHANGE: Chỉ cần lọc theo `searchTerm` vì `statusFilter` đã được xử lý ở server
  const filteredApplications = useMemo(() => {
    if (!applications) return [];
    return applications.filter((app: Application) => {
      const searchLower = searchTerm.toLowerCase();
      return (
        searchTerm === "" ||
        app.applicationData.orgName.toLowerCase().includes(searchLower) ||
        app.applicationID.toLowerCase().includes(searchLower)
      );
    });
  }, [applications, searchTerm]);

  // ✨ CHANGE: Hiển thị skeleton loading khi `isLoading` là true
  if (isLoading && !response) {
    return <ApplicationCardSkeleton />;
  }

  // ✨ CHANGE: Sử dụng `isError` từ hook
  if (isError) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold">
            Failed to load applications.
          </h2>
          <Button className="mt-4" onClick={() => refetch()}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-white/20 sticky top-0 z-10">
        <div className="w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                Application Management
              </h1>
              <p className="text-gray-600 text-sm mt-1">
                Organizer Application Management System
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
          {statsData.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card
                key={stat.title}
                className="relative overflow-hidden bg-white/70 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
              >
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-12 h-12 bg-gradient-to-r ${stat.gradient} rounded-xl flex items-center justify-center shadow-lg`}
                    >
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-600 mb-1">
                        {stat.title}
                      </p>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-gray-900">
                          {stat.value}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Search and Filter */}
        <Card className="mb-8 bg-white/70 backdrop-blur-sm border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search by organizer name or application code..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div className="w-full sm:w-48">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="border-gray-200 focus:border-blue-500">
                    <div className="flex items-center gap-2">
                      <Filter className="w-4 h-4 text-gray-400" />
                      <SelectValue placeholder="Status Filter" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    {Object.values(APPLY_STATUS)
                      .filter((status) => status !== APPLY_STATUS.NONE)
                      .map((status) => (
                        <SelectItem key={status} value={status}>
                          {statusLabels[status]}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Applications Grid */}
        <div className="grid gap-6">
          {filteredApplications.map((app) => (
            <ApplicationCard
              key={app.applicationID}
              application={app}
              isLockingByAdmin={app.status === APPLY_STATUS.LOCKED_BY_ADMIN}
              onLockByAdmin={async () => await Promise.resolve()}
              onApprove={async () =>
                await approve.mutateAsync(app.applicationID)
              }
              onReject={async () => await reject.mutateAsync(app.applicationID)}
              onPermanentReject={async () =>
                await permanentReject.mutateAsync(app.applicationID)
              }
              onMarkProcessing={async () =>
                await markProcessing.mutateAsync(app.applicationID)
              }
              // Truyền trạng thái `isPending` để vô hiệu hóa button khi đang xử lý
              isApproving={approve.isPending}
              isRejecting={reject.isPending}
              isPermanentRejecting={permanentReject.isPending}
              isMarkingProcessing={markProcessing.isPending}
            />
          ))}
        </div>

        {/* Empty State */}
        {filteredApplications.length === 0 && !isLoading && (
          <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
            <CardContent className="p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No applications found
              </h3>
              <p className="text-gray-600 mb-5">
                Try adjusting your search or filter to find what you're looking
                for.
              </p>
              <Button
                variant="ghost"
                onClick={() => {
                  setSearchTerm("");
                  setStatusFilter("all");
                }}
              >
                Clear Filters
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
