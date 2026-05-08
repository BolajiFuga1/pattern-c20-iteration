"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Business, Service } from "@/lib/types";

export default function SettingsClient({ business }: { business: Business }) {
  const router = useRouter();
  const [name, setName] = useState(business.name);
  const [timezone, setTimezone] = useState(business.timezone);
  const [services, setServices] = useState<Service[]>(business.services ?? []);
  const [systemPrompt, setSystemPrompt] = useState(business.system_prompt ?? "");
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setError(null);
    const res = await fetch("/api/businesses", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, timezone, services, system_prompt: systemPrompt }),
    });
    const json = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(json.error ?? "Could not save settings");
      return;
    }
    setSavedAt(new Date().toLocaleTimeString());
    router.refresh();
  }

  const telegramLink =
    business.telegram_link_token && process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME
      ? `https://t.me/${process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME}?start=${business.telegram_link_token}`
      : null;

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold">Settings</h1>

      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-base font-semibold">Phone number</h2>
        <p className="mt-1 text-sm text-slate-600">
          Callers reach your AI receptionist on:
        </p>
        <code className="mt-2 inline-block rounded bg-slate-100 px-2 py-1 text-sm">
          {business.phone_number ?? "(not provisioned)"}
        </code>
      </section>

      <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-base font-semibold">Business profile</h2>
        <div>
          <label className="block text-sm font-medium">Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Timezone</label>
          <input
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
          />
        </div>
      </section>

      <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-base font-semibold">Services</h2>
        {services.map((s, i) => (
          <div key={s.id} className="flex gap-2">
            <input
              value={s.name}
              onChange={(e) => {
                const copy = [...services];
                copy[i] = { ...s, name: e.target.value };
                setServices(copy);
              }}
              className="flex-1 rounded-md border border-slate-300 px-3 py-2"
            />
            <input
              type="number"
              value={s.duration_min}
              onChange={(e) => {
                const copy = [...services];
                copy[i] = { ...s, duration_min: Number(e.target.value) || 30 };
                setServices(copy);
              }}
              className="w-24 rounded-md border border-slate-300 px-3 py-2"
            />
            <button
              type="button"
              onClick={() => setServices(services.filter((x) => x.id !== s.id))}
              className="rounded-md border border-slate-300 px-2 hover:bg-slate-100"
            >
              ×
            </button>
          </div>
        ))}
        <button
          type="button"
          className="text-sm font-medium text-brand-600 hover:underline"
          onClick={() =>
            setServices([
              ...services,
              { id: String(Date.now()), name: "", duration_min: 30 },
            ])
          }
        >
          + Add service
        </button>
      </section>

      <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-base font-semibold">AI instructions</h2>
        <p className="text-sm text-slate-600">
          What the receptionist should say and do. Mention your specialties, tone, FAQs.
        </p>
        <textarea
          value={systemPrompt}
          onChange={(e) => setSystemPrompt(e.target.value)}
          rows={10}
          className="w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-xs"
        />
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-base font-semibold">Telegram</h2>
        {business.telegram_chat_id ? (
          <p className="mt-1 text-sm text-emerald-700">
            ✓ Linked. We'll send call summaries to your Telegram.
          </p>
        ) : telegramLink ? (
          <a href={telegramLink} target="_blank" rel="noreferrer" className="text-brand-600 hover:underline">
            Link Telegram bot
          </a>
        ) : (
          <p className="mt-1 text-sm text-slate-500">Telegram bot not configured.</p>
        )}
      </section>

      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex items-center gap-3">
        <button
          onClick={save}
          disabled={saving}
          className="rounded-md bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
        {savedAt && <span className="text-sm text-slate-500">Saved at {savedAt}</span>}
      </div>
    </div>
  );
}
