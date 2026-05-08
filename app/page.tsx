import Link from "next/link";
import OwnerCta from "./OwnerCta";

export default function LandingPage() {
  return (
    <main className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="text-xl font-bold tracking-tight">AI Receptionist</div>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/login" className="text-slate-600 hover:text-slate-900">Sign in</Link>
          <Link
            href="/signup"
            className="rounded-md bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-700"
          >
            Get started
          </Link>
        </nav>
      </header>

      <section className="mx-auto max-w-4xl px-6 py-24 text-center">
        <h1 className="text-5xl font-semibold tracking-tight sm:text-6xl">
          Never miss a call. Never miss a booking.
        </h1>
        <p className="mt-6 text-lg text-slate-600">
          Give your business a 24/7 AI receptionist. It answers customer questions in a natural
          voice, books appointments, and sends every conversation summary straight to your Telegram.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <OwnerCta />
          <Link
            href="/signup"
            className="rounded-md bg-brand-600 px-6 py-3 font-medium text-white hover:bg-brand-700"
          >
            Start free
          </Link>
          <Link
            href="/login"
            className="rounded-md border border-slate-300 bg-white px-6 py-3 font-medium hover:bg-slate-100"
          >
            Sign in
          </Link>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          One-click owner sign-in goes straight to the dashboard with demo data.
        </p>
      </section>

      <section className="mx-auto grid max-w-5xl gap-6 px-6 pb-24 sm:grid-cols-3">
        {[
          {
            title: "Sounds human",
            body: "Powered by Vapi voice models — callers won't know they're talking to AI.",
          },
          {
            title: "Books for you",
            body: "It checks your hours, finds free slots, and confirms the appointment on the call.",
          },
          {
            title: "Pings your Telegram",
            body: "After every call you get the summary, customer details, and any booking made.",
          },
        ].map((f) => (
          <div key={f.title} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="text-base font-semibold">{f.title}</div>
            <p className="mt-2 text-sm text-slate-600">{f.body}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
