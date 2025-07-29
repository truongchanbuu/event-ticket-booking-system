"use client";
import { logout } from "@/services/auth.service";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "../ui/button";

export function AdminHeader({ adminEmail }: { adminEmail: string }) {
  const router = useRouter();

  return (
    <header className="w-full flex justify-between items-center bg-white p-4 shadow">
      <Button variant="ghost" onClick={router.back}>
        <ArrowLeft />
      </Button>
      <h1 className="text-xl font-bold">Admin Dashboard</h1>
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-600">{adminEmail}</span>
        <button
          onClick={async () => await logout()}
          className="bg-red-500 text-white font-bold px-4 py-2 rounded hover:bg-red-600"
        >
          Log out
        </button>
      </div>
    </header>
  );
}
