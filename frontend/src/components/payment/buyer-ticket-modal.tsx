import { useState, useMemo } from "react";
import { z } from "zod";
import { useRouter } from "next/navigation";
// import { fetchAPI } from "@/lib/fetchAPI"; // proxy wrapper của bạn

const BuyerSchema = z.object({
  email: z.string().email("Email không hợp lệ"),
  phone: z
    .string()
    .min(8, "SĐT quá ngắn")
    .max(15)
    .regex(/^\+?\d+$/, "Chỉ số và +"),
  name: z.string().max(80).optional(),
});

export function BuyTicketModal({
  eventId,
  ttId,
  onClose,
  currentUser,
}: {
  eventId: string;
  ttId: string;
  onClose: () => void;
  currentUser?: { email?: string; phoneNumber?: string; displayName?: string };
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    email: currentUser?.email || "",
    phone: currentUser?.phoneNumber || "",
    name: currentUser?.displayName || "",
  });
  const idemKey = useMemo(
    () =>
      globalThis.crypto?.randomUUID?.() ??
      `idem-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    []
  );

  async function onSubmit() {
    const parsed = BuyerSchema.safeParse(form);
    if (!parsed.success) {
      alert(parsed.error.errors[0]?.message ?? "Dữ liệu không hợp lệ");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/proxy/checkout/reservations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idemKey,
          // "X-Skip-Auth": "1",
        },
        body: JSON.stringify({
          eventId,
          lines: [{ ttId, qty: 1 }],
          buyer: parsed.data,
        }),
      });
      const payload = await res.json().catch(() => ({}));
      const data = payload?.data ?? payload;

      if (res.status === 409 && payload?.error === "IDEMPOTENCY_IN_PROGRESS") {
        await new Promise((r) =>
          setTimeout(r, Number(payload?.retryAfterMs ?? 800))
        );
        return onSubmit();
      }
      if (res.ok && data?.reservationId) {
        router.push(`/checkout/${data.reservationId}`); // sang trang thanh toán/đếm ngược
      } else {
        throw new Error(payload?.message || "Tạo reservation thất bại");
      }
    } catch (e: any) {
      alert(e?.message ?? "Có lỗi xảy ra");
    } finally {
      setSubmitting(false);
      onClose();
    }
  }

  return (
    <div className="fixed inset-0 grid place-items-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-4">
        <h3 className="text-xl font-semibold">Xác nhận thông tin liên hệ</h3>
        <div className="space-y-3">
          <input
            className="w-full rounded-xl border p-3"
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))}
          />
          <input
            className="w-full rounded-xl border p-3"
            placeholder="Phone Number"
            value={form.phone}
            onChange={(e) => setForm((s) => ({ ...s, phone: e.target.value }))}
          />
          <input
            className="w-full rounded-xl border p-3"
            placeholder="Name"
            value={form.name}
            onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
          />
        </div>
        <div className="flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-xl border">
            Cancel
          </button>
          <button
            onClick={onSubmit}
            disabled={submitting}
            className="px-4 py-2 rounded-xl bg-black text-white"
          >
            {submitting ? "Đang giữ chỗ..." : "Xác nhận & Giữ chỗ"}
          </button>
        </div>
      </div>
    </div>
  );
}
