"use client";

import React, { useState } from "react";
import {
  Search,
  MapPin,
  Calendar,
  Users,
  Star,
  ArrowRight,
  Filter,
  CheckCircle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { categories } from "@/constants/categories";
import { ORGANIZER_STATUS } from "@/schema/enums/organizer-status";
import EventCategories from "@/components/events/event-categories";

const OrganizersPage = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const organizers = mockOrganizers;
  const filteredOrganizers = mockOrganizers.filter((organizer) => {
    const matchesSearch =
      organizer.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      organizer.bio?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      selectedCategory === "all" ||
      organizer.categories?.some((cat) => cat.id === selectedCategory);
    return matchesSearch && matchesCategory;
  });

  const getCategoryName = (categoryId: string) => {
    const category = categories.find((cat) => cat.id === categoryId);
    return category ? category.name : categoryId;
  };

  const getCategoryIcon = (categoryId: string) => {
    const category = categories.find((cat) => cat.id === categoryId);
    return category ? category.icon : "🎯";
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Event Organizers
              </h1>
              <p className="text-gray-600 mt-1">
                Discover trusted event organizers
              </p>
            </div>

            {/* Search Bar */}
            <div className="relative max-w-md w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 z-10" />
              <Input
                type="text"
                placeholder="Search for organizer..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-8">
          <div className="flex items-center gap-2 text-sm text-gray-600 mr-4">
            <Filter className="w-4 h-4" />
            <span>Filter by:</span>
          </div>
          <Button
            onClick={() => setSelectedCategory("all")}
            variant={selectedCategory === "all" ? "default" : "outline"}
            size="sm"
            className="rounded-full"
          >
            All
          </Button>
          {categories.map((category) => (
            <Button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              variant={selectedCategory === category.id ? "default" : "outline"}
              size="sm"
              className="rounded-full"
            >
              <span className="mr-1">{category.icon}</span>
              {category.name}
            </Button>
          ))}
        </div>

        {/* Organizers Grid */}
        <div className="space-y-4">
          {filteredOrganizers.map((organizer) => (
            <Card
              key={organizer.organizerId}
              className="overflow-hidden hover:shadow-lg transition-shadow duration-300 group"
            >
              {/* Banner - Full Width */}
              <div className="relative h-48 bg-gradient-to-r from-blue-500 to-purple-600 overflow-hidden">
                <img
                  src={`https://images.unsplash.com/photo-${Math.random().toString(36).substring(7)}?w=400&h=200&fit=crop`}
                  alt={organizer.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-black bg-opacity-20"></div>
                {organizer.organizerStatus === ORGANIZER_STATUS.APPROVED && (
                  <Badge className="absolute top-3 right-3 bg-green-500 hover:bg-green-600">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Verified
                  </Badge>
                )}
              </div>

              {/* Content - Below Banner */}
              <CardContent className="p-6">
                {/* Avatar and Basic Info - Horizontal */}
                <div className="flex items-center gap-4 mb-4">
                  <Avatar className="w-16 h-16 border-4 border-white shadow-md flex-shrink-0 relative z-10">
                    <AvatarImage
                      src={organizer.photoUrl}
                      alt={organizer.name}
                    />
                    <AvatarFallback className="text-lg font-semibold">
                      {organizer.name?.charAt(0) || "O"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-lg text-gray-900 mb-1 truncate">
                      {organizer.name}
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <MapPin className="w-4 h-4 flex-shrink-0" />
                      <span>Vietnam</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 ml-4">
                    <Star className="w-4 h-4 text-yellow-400 fill-current" />
                    <span className="text-sm font-medium text-gray-700">
                      {Math.floor(Math.random() * 2) + 4}.
                      {Math.floor(Math.random() * 9) + 1}
                    </span>
                  </div>
                </div>

                {/* Categories */}
                {organizer.categories && organizer.categories.length > 0 && (
                  <EventCategories categories={organizer.categories} />
                )}

                {/* Description */}
                <p className="text-gray-600 text-sm mb-1 mt-3 line-clamp-2">
                  {organizer.bio || "Professional event organizer"}
                </p>

                {/* Stats and Button */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>{organizer.eventsCount} events</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      <span>{organizer.followersCount} followers</span>
                    </div>
                  </div>
                  <Link href={`/organizer/${organizer.organizerId}`}>
                    <Button className="group">
                      <span>View Details</span>
                      <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* No Results */}
        {filteredOrganizers.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <Search className="w-16 h-16 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No results found
            </h3>
            <p className="text-gray-600">Try changing the search or filter</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrganizersPage;
