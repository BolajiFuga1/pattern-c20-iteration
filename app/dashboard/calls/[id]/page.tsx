import { notFound } from "next/navigation";
import Link from "next/link";
import { requireBusiness } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase/server";

type TranscriptTurn = { role: string; message: string; time?: number };

export default async function CallDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const business = await requireBusiness();
  const supabase = await getSupabaseServerClient();

  const { data: call } = await supabase
    .from("calls")
    .select("*")
    .eq("id", id)
    .eq("business_id", business.id)
    .maybeSingle();

  if (!call) notFound();

  const { data: bookings } = await supabase
    .from("bookings")
    .select("id, customer_name, customer_phone, service, scheduled_at, notes")
    .eq("call_id", call.id);

  const transcript = (call.transcript as TranscriptTurn[] | null) ?? [];

  return (
    <div className="space-y-6">
      <Link href="/dashboard/calls" className="text-sm text-brand-600 hover:underline">
        ← All calls
      </Link>
      <div>
        <h1 className="text-2xl font-semibold">{call.caller_phone ?? "Unknown caller"}</h1>
        <p className="text-sm text-slate-600">
          {call.started_at ? new Date(call.started_at).toLocaleString() : ""}
          {call.duration_sec ? ` · ${call.duration_sec}s` : ""} · {call.status}
        </p>
      </div>

      {call.summary && (
        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Summary</h2>
          <p className="mt-2 text-sm">{call.summary}</p>
        </section>
      )}

      {bookings && bookings.length > 0 && (
        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Bookings made</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {bookings.map((b) => (
              <li key={b.id}>
                <span className="font-medium">{b.service}</span> for {b.customer_name} ({b.customer_phone})
                — {new Date(b.scheduled_at).toLocaleString()}
                {b.notes ? ` · ${b.notes}` : ""}
              </li>
            ))}
          </ul>
        </section>
      )}

      {call.recording_url && (
        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Recording</h2>
          <audio controls src={call.recording_url} className="mt-2 w-full" />
        </section>
      )}

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Transcript</h2>
        {transcript.length > 0 ? (
          <ol className="mt-3 space-y-3 text-sm">
            {transcript.map((t, i) => (
              <li key={i}>
                <div className="text-xs uppercase text-slate-500">{t.role}</div>
                <div>{t.message}</div>
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-2 text-sm text-slate-500">No transcript available.</p>
        )}
      </section>
    </div>
  );
}
