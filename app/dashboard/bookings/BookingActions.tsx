"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function BookingActions({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  if (status === "cancelled") return null;

  return (
    <button
      disabled={busy}
      onClick={async () => {
        if (!confirm("Cancel this booking?")) return;
        setBusy(true);
        await fetch(`/api/bookings/${id}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ status: "cancelled" }),
        });
        setBusy(false);
        router.refresh();
      }}
      className="rounded border border-slate-300 px-2 py-1 text-xs hover:bg-slate-100 disabled:opacity-60"
    >
      {busy ? "…" : "Cancel"}
    </button>
  );
}
