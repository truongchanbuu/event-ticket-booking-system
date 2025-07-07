"use client";

import React, { useState } from "react";
import {
  Edit2,
  Save,
  X,
  Calendar,
  Phone,
  Mail,
  User,
  Shield,
  Activity,
  Clock,
  TrendingUp,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import ProtectedRoute from "@/components/ProtectRoute";

const UserProfilePage = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Sample user data
  const [userData, setUserData] = useState({
    username: "Sarah Johnson",
    email: "sarah.johnson@email.com",
    photoUrl: "https://avatar.iran.liara.run/public",
    role: "organizer",
    phoneNumber: "+1 (555) 123-4567",
    birthday: "1992-05-15",
    status: "active",
    organizerStatus: "verified",
    emailVerified: true,
    phoneNumberVerified: false,
    followedOrganizers: ["Alex Chen", "Maria Rodriguez", "David Kim"],
    preferenceCategories: ["Technology", "Music", "Art", "Food", "Travel"],
    reportCount: 3,
    riskScore: 15,
    createdAt: "2023-01-15T10:30:00Z",
    updatedAt: "2024-12-20T14:22:00Z",
  });

  const [editData, setEditData] = useState(userData);

  const handleEdit = () => {
    setIsEditing(true);
    setEditData(userData);
  };

  const handleSave = () => {
    setUserData(editData);
    setIsEditing(false);
    setHasChanges(false);
  };

  const handleCancel = () => {
    setEditData(userData);
    setIsEditing(false);
    setHasChanges(false);
  };

  const handleInputChange = (field, value) => {
    setEditData((prev) => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case "admin":
        return "bg-red-100 text-red-800 border-red-200";
      case "organizer":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "customer":
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800 border-green-200";
      case "inactive":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "suspended":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getOrganizerStatusColor = (status) => {
    switch (status) {
      case "verified":
        return "bg-emerald-100 text-emerald-800 border-emerald-200";
      case "pending":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "rejected":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getRiskScoreColor = (score) => {
    if (score <= 30) return "bg-green-500";
    if (score <= 70) return "bg-yellow-500";
    return "bg-red-500";
  };

  const getInitials = (name) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  const categoryColors = [
    "bg-purple-100 text-purple-800 border-purple-200",
    "bg-pink-100 text-pink-800 border-pink-200",
    "bg-indigo-100 text-indigo-800 border-indigo-200",
    "bg-teal-100 text-teal-800 border-teal-200",
    "bg-orange-100 text-orange-800 border-orange-200",
  ];

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Profile Header */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 mb-6">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
              <div className="relative">
                {userData.photoUrl ? (
                  <img
                    src={userData.photoUrl}
                    alt="Profile"
                    className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-lg"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xl font-semibold border-4 border-white shadow-lg">
                    {getInitials(userData.username)}
                  </div>
                )}
              </div>

              <div className="flex-1 text-center md:text-left">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  {userData.username}
                </h1>
                <p className="text-gray-600 mb-3 flex items-center justify-center md:justify-start gap-2">
                  <Mail className="w-4 h-4" />
                  {userData.email}
                  {userData.emailVerified && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                      ✓ Verified
                    </span>
                  )}
                </p>
                <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium border ${getRoleBadgeColor(userData.role)}`}
                  >
                    <Shield className="w-3 h-3 inline mr-1" />
                    {userData.role.charAt(0).toUpperCase() +
                      userData.role.slice(1)}
                  </span>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusBadgeColor(userData.status)}`}
                  >
                    {userData.status.charAt(0).toUpperCase() +
                      userData.status.slice(1)}
                  </span>
                  {userData.role === "organizer" && (
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium border ${getOrganizerStatusColor(userData.organizerStatus)}`}
                    >
                      {userData.organizerStatus.charAt(0).toUpperCase() +
                        userData.organizerStatus.slice(1)}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                {!isEditing ? (
                  <button
                    onClick={handleEdit}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                    Edit Profile
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={handleSave}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      <Save className="w-4 h-4" />
                      Save
                    </button>
                    <button
                      onClick={handleCancel}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                    >
                      <X className="w-4 h-4" />
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Basic Information */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Basic Information
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Phone className="w-4 h-4 inline mr-1" />
                      Phone Number
                    </label>
                    {isEditing ? (
                      <input
                        type="tel"
                        value={editData.phoneNumber}
                        onChange={(e) =>
                          handleInputChange("phoneNumber", e.target.value)
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    ) : (
                      <div className="flex items-center gap-2">
                        <p className="text-gray-900 py-2">
                          {userData.phoneNumber}
                        </p>
                        {userData.phoneNumberVerified ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                            ✓ Verified
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-200">
                            ⚠ Not Verified
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Calendar className="w-4 h-4 inline mr-1" />
                      Birthday
                    </label>
                    {isEditing ? (
                      <input
                        type="date"
                        value={editData.birthday}
                        onChange={(e) =>
                          handleInputChange("birthday", e.target.value)
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    ) : (
                      <p className="text-gray-900 py-2">
                        {formatDate(userData.birthday)}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Preferences & Interests */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  Preferences & Interests
                </h2>

                <div className="mb-6">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">
                    Followed Organizers
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {userData.followedOrganizers.map((organizer, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm border border-blue-200"
                      >
                        {organizer}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-3">
                    Interest Categories
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {userData.preferenceCategories.map((category, index) => (
                      <span
                        key={index}
                        className={`px-3 py-1 rounded-full text-sm font-medium border ${categoryColors[index % categoryColors.length]}`}
                      >
                        {category}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Activity Section */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Activity & Security
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">
                      Report Count
                    </h3>
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-orange-500" />
                      <span className="text-2xl font-bold text-gray-900">
                        {userData.reportCount}
                      </span>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">
                      Risk Score
                    </h3>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${getRiskScoreColor(userData.riskScore)}`}
                          style={{ width: `${userData.riskScore}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium text-gray-700">
                        {userData.riskScore}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Account Timeline
                </h2>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-1">
                      Created
                    </h3>
                    <p className="text-gray-900">
                      {formatDate(userData.createdAt)}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-1">
                      Last Updated
                    </h3>
                    <p className="text-gray-900">
                      {formatDate(userData.updatedAt)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Save Changes Alert */}
          {hasChanges && (
            <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2">
              <span>You have unsaved changes</span>
              <button
                onClick={handleSave}
                className="bg-white text-blue-600 px-3 py-1 rounded text-sm font-medium hover:bg-blue-50"
              >
                Save Now
              </button>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default UserProfilePage;
