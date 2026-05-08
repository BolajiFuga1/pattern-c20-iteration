import { requireBusiness } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function DashboardPage() {
  const business = await requireBusiness();
  const supabase = await getSupabaseServerClient();

  const [{ data: callsToday }, { data: upcomingBookings }, { data: recentCalls }] =
    await Promise.all([
      supabase
        .from("calls")
        .select("id, started_at")
        .eq("business_id", business.id)
        .gte("started_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
      supabase
        .from("bookings")
        .select("id, customer_name, service, scheduled_at, status")
        .eq("business_id", business.id)
        .gte("scheduled_at", new Date().toISOString())
        .neq("status", "cancelled")
        .order("scheduled_at", { ascending: true })
        .limit(5),
      supabase
        .from("calls")
        .select("id, caller_phone, summary, started_at, duration_sec")
        .eq("business_id", business.id)
        .order("started_at", { ascending: false })
        .limit(5),
    ]);

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-2xl font-semibold">Overview</h1>
        <p className="mt-1 text-sm text-slate-600">
          Your AI receptionist number:{" "}
          <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">
            {business.phone_number ?? "(not provisioned yet)"}
          </code>
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <Stat label="Calls (24h)" value={callsToday?.length ?? 0} />
        <Stat label="Upcoming bookings" value={upcomingBookings?.length ?? 0} />
        <Stat
          label="Telegram"
          value={business.telegram_chat_id ? "Linked" : "Not linked"}
        />
      </section>

      <section>
        <h2 className="text-lg font-semibold">Upcoming bookings</h2>
        <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-white">
          {upcomingBookings && upcomingBookings.length > 0 ? (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-2">When</th>
                  <th className="px-4 py-2">Customer</th>
                  <th className="px-4 py-2">Service</th>
                </tr>
              </thead>
              <tbody>
                {upcomingBookings.map((b) => (
                  <tr key={b.id} className="border-t border-slate-100">
                    <td className="px-4 py-2">{new Date(b.scheduled_at).toLocaleString()}</td>
                    <td className="px-4 py-2">{b.customer_name}</td>
                    <td className="px-4 py-2">{b.service}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="px-4 py-6 text-sm text-slate-500">No upcoming bookings yet.</p>
          )}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold">Recent calls</h2>
        <div className="mt-3 space-y-2">
          {recentCalls && recentCalls.length > 0 ? (
            recentCalls.map((c) => (
              <Link
                key={c.id}
                href={`/dashboard/calls/${c.id}`}
                className="block rounded-lg border border-slate-200 bg-white p-4 text-sm hover:border-brand-500"
              >
                <div className="flex items-center justify-between">
                  <div className="font-medium">{c.caller_phone ?? "Unknown caller"}</div>
                  <div className="text-xs text-slate-500">
                    {c.started_at ? new Date(c.started_at).toLocaleString() : ""}
                    {c.duration_sec ? ` · ${c.duration_sec}s` : ""}
                  </div>
                </div>
                {c.summary && <p className="mt-1 text-slate-600">{c.summary}</p>}
              </Link>
            ))
          ) : (
            <p className="text-sm text-slate-500">No calls yet. Try calling your number.</p>
          )}
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
  );
}
