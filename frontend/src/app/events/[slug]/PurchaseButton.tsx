"use client";

import { useTransition } from "react";

export default function PurchaseButton({ disabled }: { disabled?: boolean }) {
  const [isPending, startTransition] = useTransition();

  function onClick() {
    if (disabled || isPending) return;
    startTransition(async () => {
      // Navigate to checkout or open modal
      // router.push(`/checkout?...`)
      // placeholder
      console.log("buy");
    });
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || isPending}
      aria-disabled={disabled || isPending}
      className="w-full h-11 rounded-xl bg-black text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
    >
      {disabled ? "Hết vé" : isPending ? "Đang mở thanh toán…" : "Mua vé"}
    </button>
  );
}
