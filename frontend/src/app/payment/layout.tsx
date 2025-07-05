"use client";
import { usePathname } from "next/navigation";
import PaymentHeader from "@/components/payment/payment-header";
import { ReactNode } from "react";
import Header from "@/components/app-header";

export default function PaymentLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isHistoryPage = pathname.includes("/payment/history");
  return (
    <>
      {isHistoryPage ? <Header /> : <PaymentHeader />}
      <main>{children}</main>
    </>
  );
}
