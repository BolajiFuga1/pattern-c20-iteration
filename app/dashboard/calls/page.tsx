import Link from "next/link";
import { requireBusiness } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export default async function CallsPage() {
  const business = await requireBusiness();
  const supabase = await getSupabaseServerClient();
  const { data: calls } = await supabase
    .from("calls")
    .select("id, caller_phone, started_at, duration_sec, summary, status")
    .eq("business_id", business.id)
    .order("started_at", { ascending: false })
    .limit(100);

  return (
    <div>
      <h1 className="text-2xl font-semibold">Calls</h1>
      <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white">
        {calls && calls.length > 0 ? (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-2">When</th>
                <th className="px-4 py-2">Caller</th>
                <th className="px-4 py-2">Duration</th>
                <th className="px-4 py-2">Summary</th>
              </tr>
            </thead>
            <tbody>
              {calls.map((c) => (
                <tr key={c.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="whitespace-nowrap px-4 py-2">
                    <Link className="text-brand-600 hover:underline" href={`/dashboard/calls/${c.id}`}>
                      {c.started_at ? new Date(c.started_at).toLocaleString() : "—"}
                    </Link>
                  </td>
                  <td className="px-4 py-2">{c.caller_phone ?? "Unknown"}</td>
                  <td className="px-4 py-2">{c.duration_sec ? `${c.duration_sec}s` : "—"}</td>
                  <td className="px-4 py-2 text-slate-600">{c.summary ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="px-4 py-6 text-sm text-slate-500">No calls yet.</p>
        )}
      </div>
    </div>
  );
}
