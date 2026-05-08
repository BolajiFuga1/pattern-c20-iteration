import { requireBusiness } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import BookingActions from "./BookingActions";

export default async function BookingsPage() {
  const business = await requireBusiness();
  const supabase = await getSupabaseServerClient();

  const { data: bookings } = await supabase
    .from("bookings")
    .select("id, customer_name, customer_phone, service, scheduled_at, status, notes")
    .eq("business_id", business.id)
    .order("scheduled_at", { ascending: true })
    .limit(200);

  return (
    <div>
      <h1 className="text-2xl font-semibold">Bookings</h1>
      <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white">
        {bookings && bookings.length > 0 ? (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-2">When</th>
                <th className="px-4 py-2">Customer</th>
                <th className="px-4 py-2">Service</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => (
                <tr key={b.id} className="border-t border-slate-100">
                  <td className="whitespace-nowrap px-4 py-2">{new Date(b.scheduled_at).toLocaleString()}</td>
                  <td className="px-4 py-2">
                    {b.customer_name}
                    <div className="text-xs text-slate-500">{b.customer_phone}</div>
                  </td>
                  <td className="px-4 py-2">{b.service}</td>
                  <td className="px-4 py-2">
                    <span
                      className={
                        b.status === "cancelled"
                          ? "rounded bg-red-100 px-2 py-0.5 text-xs text-red-700"
                          : "rounded bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700"
                      }
                    >
                      {b.status}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <BookingActions id={b.id} status={b.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="px-4 py-6 text-sm text-slate-500">No bookings yet.</p>
        )}
      </div>
    </div>
  );
}
