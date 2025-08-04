"use client";

import React from "react";
import { usePathname } from "next/navigation";
import {
  Calendar,
  Users,
  Shield,
  Mail,
  Phone,
  MapPin,
  Facebook,
  Twitter,
  Instagram,
  Linkedin,
  ExternalLink,
  Heart,
  Star,
  Award,
  CheckCircle,
} from "lucide-react";
import { APP_NAME, TEAM_NAME } from "@/constants/app";

const Footer = () => {
  const pathname = usePathname();

  const hideFooterPrefixes = [
    "/profile",
    "/unauthorized",
    "/auth",
    "/organizers",
    "/payment",
    "/admin",
  ];

  const shouldShowFooter = !hideFooterPrefixes.some((prefix) =>
    pathname.startsWith(prefix)
  );

  return (
    shouldShowFooter && (
      <footer className="bg-gradient-to-b from-slate-900 to-slate-950 text-white mt-10">
        {/* Stats Section */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 py-8">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
              <div className="group">
                <div className="text-3xl font-bold mb-2 group-hover:scale-110 transition-transform">
                  10K+
                </div>
                <div className="text-sm opacity-90">Events Organized</div>
              </div>
              <div className="group">
                <div className="text-3xl font-bold mb-2 group-hover:scale-110 transition-transform">
                  50K+
                </div>
                <div className="text-sm opacity-90">Attendees</div>
              </div>
              <div className="group">
                <div className="text-3xl font-bold mb-2 group-hover:scale-110 transition-transform">
                  2K+
                </div>
                <div className="text-sm opacity-90">Organizers</div>
              </div>
              <div className="group">
                <div className="text-3xl font-bold mb-2 group-hover:scale-110 transition-transform">
                  98%
                </div>
                <div className="text-sm opacity-90">Satisfied</div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Footer Content */}
        <div className="container mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Brand Section */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                  {APP_NAME}
                </h3>
              </div>
              <p className="text-gray-300 text-sm leading-relaxed">
                Vietnam's leading event ticketing platform. Connecting
                unforgettable experiences with the community of event lovers.
              </p>
              <div className="flex items-center space-x-2 text-sm text-gray-400">
                <CheckCircle className="w-4 h-4 text-green-400" />
                <span>Approved by professional team</span>
              </div>
            </div>

            {/* For Organizers */}
            <div className="space-y-4">
              <h4 className="text-lg font-semibold flex items-center space-x-2">
                <Users className="w-5 h-5 text-blue-400" />
                <span>For Organizer</span>
              </h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <a
                    href="#"
                    className="text-gray-300 hover:text-blue-400 transition-colors flex items-center space-x-2"
                  >
                    <span>Create Event</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-gray-300 hover:text-blue-400 transition-colors"
                  >
                    Ticket Management
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-gray-300 hover:text-blue-400 transition-colors"
                  >
                    Report & Statistics
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-gray-300 hover:text-blue-400 transition-colors"
                  >
                    Organizer Guide
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-gray-300 hover:text-blue-400 transition-colors"
                  >
                    Approval Policy
                  </a>
                </li>
              </ul>
            </div>

            {/* For Attendees */}
            <div className="space-y-4">
              <h4 className="text-lg font-semibold flex items-center space-x-2">
                <Star className="w-5 h-5 text-yellow-400" />
                <span>For customer</span>
              </h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <a
                    href="#"
                    className="text-gray-300 hover:text-blue-400 transition-colors"
                  >
                    Find Events
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-gray-300 hover:text-blue-400 transition-colors"
                  >
                    My Tickets
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-gray-300 hover:text-blue-400 transition-colors"
                  >
                    Booking History
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-gray-300 hover:text-blue-400 transition-colors"
                  >
                    Event Rating
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-gray-300 hover:text-blue-400 transition-colors"
                  >
                    User Support
                  </a>
                </li>
              </ul>
            </div>

            {/* Contact & Support */}
            <div className="space-y-4">
              <h4 className="text-lg font-semibold flex items-center space-x-2">
                <Shield className="w-5 h-5 text-green-400" />
                <span>Contact</span>
              </h4>
              <div className="space-y-3 text-sm">
                <div className="flex items-center space-x-3 text-gray-300">
                  <Mail className="w-4 h-4 text-blue-400" />
                  <a
                    href="mailto:support@eventhub.vn"
                    className="hover:text-blue-400 transition-colors"
                  >
                    support@eventhub.vn
                  </a>
                </div>
                <div className="flex items-center space-x-3 text-gray-300">
                  <Phone className="w-4 h-4 text-green-400" />
                  <a
                    href="tel:+84123456789"
                    className="hover:text-blue-400 transition-colors"
                  >
                    +84 123 456 789
                  </a>
                </div>
                <div className="flex items-center space-x-3 text-gray-300">
                  <MapPin className="w-4 h-4 text-red-400" />
                  <span>Ho Chi Minh City, Vietnam</span>
                </div>
              </div>

              {/* Social Media */}
              <div className="pt-4">
                <h5 className="text-sm font-medium mb-3">Connect with us</h5>
                <div className="flex space-x-3">
                  <a
                    href="#"
                    className="w-9 h-9 bg-blue-600 rounded-full flex items-center justify-center hover:bg-blue-700 transition-colors"
                  >
                    <Facebook className="w-4 h-4" />
                  </a>
                  <a
                    href="#"
                    className="w-9 h-9 bg-sky-500 rounded-full flex items-center justify-center hover:bg-sky-600 transition-colors"
                  >
                    <Twitter className="w-4 h-4" />
                  </a>
                  <a
                    href="#"
                    className="w-9 h-9 bg-pink-600 rounded-full flex items-center justify-center hover:bg-pink-700 transition-colors"
                  >
                    <Instagram className="w-4 h-4" />
                  </a>
                  <a
                    href="#"
                    className="w-9 h-9 bg-blue-700 rounded-full flex items-center justify-center hover:bg-blue-800 transition-colors"
                  >
                    <Linkedin className="w-4 h-4" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Newsletter Section */}
        <div className="border-t border-gray-800">
          <div className="container mx-auto px-4 py-8">
            <div className="flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
              <div className="text-center md:text-left">
                <h4 className="text-lg font-semibold mb-2">
                  Get latest event news
                </h4>
                <p className="text-gray-400 text-sm">
                  Get the latest news and updates about events
                </p>
              </div>
              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 w-full md:w-auto">
                <input
                  type="email"
                  placeholder="Enter your email"
                  className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-gray-400 w-full sm:w-64"
                />
                <button className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 font-medium whitespace-nowrap">
                  Subcribe
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Footer */}
        <div className="border-t border-gray-800 bg-slate-950">
          <div className="container mx-auto px-4 py-6">
            <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
              <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-6 text-sm text-gray-400">
                <div className="flex items-center space-x-1">
                  <span>© 2025 EventHub.</span>
                  <span>Developed with {TEAM_NAME}</span>
                  <Heart className="w-4 h-4 text-red-500" />
                  <span>at Vietnam</span>
                </div>
              </div>
              <div className="flex flex-wrap justify-center md:justify-end space-x-6 text-sm text-gray-400">
                <a href="#" className="hover:text-white transition-colors">
                  Terms of Service
                </a>
                <a href="#" className="hover:text-white transition-colors">
                  Security Policy
                </a>
                <a href="#" className="hover:text-white transition-colors">
                  Cookies
                </a>
                <a href="#" className="hover:text-white transition-colors">
                  Sitemap
                </a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    )
  );
};

export default Footer;
