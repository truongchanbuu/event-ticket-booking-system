"use client";

import { APP_EMAIL } from "@/constants/app";
import { motion } from "framer-motion";
import Link from "next/link";
import React from "react";

export default function OrganizerApplyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div>
      <main>{children}</main>
      {/* Footer */}
      <footer className="pb-10 text-center text-sm text-gray-500">
        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-center mt-8 text-gray-500 text-sm"
        >
          <p className="pt-2">
            By submitting this form, you agree to our{" "}
            <Link href="#" className="text-blue-600 hover:underline">
              Terms of Service
            </Link>{" "}
            and{" "}
            <a href="#" className="text-blue-600 hover:underline">
              Privacy Policy
            </a>
          </p>
          <p>
            Need help? Contact our support team at{" "}
            <a
              href="mailto:support@eventplatform.com"
              className="text-blue-600 hover:underline"
            >
              {APP_EMAIL}
            </a>
          </p>
        </motion.div>
      </footer>
    </div>
  );
}
