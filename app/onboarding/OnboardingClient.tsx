"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Business, Service } from "@/lib/types";

type Step = "profile" | "services" | "provision" | "telegram";

export default function OnboardingClient({ existingBusiness }: { existingBusiness: Business | null }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>(
    !existingBusiness
      ? "profile"
      : !existingBusiness.services?.length
        ? "services"
        : !existingBusiness.vapi_phone_number_id
          ? "provision"
          : "telegram",
  );
  const [business, setBusiness] = useState<Business | null>(existingBusiness);

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-2xl font-semibold">Set up your receptionist</h1>
      <ol className="mt-2 flex gap-3 text-xs uppercase tracking-wide text-slate-500">
        {(["profile", "services", "provision", "telegram"] as Step[]).map((s, i) => (
          <li key={s} className={s === step ? "font-semibold text-brand-600" : ""}>
            {i + 1}. {s}
          </li>
        ))}
      </ol>

      <div className="mt-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        {step === "profile" && (
          <ProfileStep
            business={business}
            onDone={(b) => {
              setBusiness(b);
              setStep("services");
            }}
          />
        )}
        {step === "services" && business && (
          <ServicesStep
            business={business}
            onDone={(b) => {
              setBusiness(b);
              setStep("provision");
            }}
          />
        )}
        {step === "provision" && business && (
          <ProvisionStep
            business={business}
            onDone={(b) => {
              setBusiness(b);
              setStep("telegram");
            }}
          />
        )}
        {step === "telegram" && business && (
          <TelegramStep
            business={business}
            onDone={() => {
              router.push("/dashboard");
              router.refresh();
            }}
          />
        )}
      </div>
    </main>
  );
}

function ProfileStep({
  business,
  onDone,
}: {
  business: Business | null;
  onDone: (b: Business) => void;
}) {
  const [name, setName] = useState(business?.name ?? "");
  const [timezone, setTimezone] = useState(
    business?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone ?? "UTC",
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/businesses", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, timezone }),
    });
    const json = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(json.error ?? "Could not save business");
      return;
    }
    onDone(json.business);
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <h2 className="text-lg font-semibold">Tell us about your business</h2>
      <div>
        <label className="block text-sm font-medium">Business name</label>
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
        />
      </div>
      <div>
        <label className="block text-sm font-medium">Timezone</label>
        <input
          required
          value={timezone}
          onChange={(e) => setTimezone(e.target.value)}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
        />
        <p className="mt-1 text-xs text-slate-500">e.g. Africa/Lagos, America/New_York</p>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="rounded-md bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-700 disabled:opacity-60"
      >
        {loading ? "Saving…" : "Continue"}
      </button>
    </form>
  );
}

function ServicesStep({
  business,
  onDone,
}: {
  business: Business;
  onDone: (b: Business) => void;
}) {
  const [services, setServices] = useState<Service[]>(
    business.services?.length ? business.services : [{ id: "1", name: "", duration_min: 30 }],
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    const cleaned = services.filter((s) => s.name.trim().length > 0);
    if (cleaned.length === 0) {
      setError("Add at least one service.");
      return;
    }
    setLoading(true);
    setError(null);
    const res = await fetch("/api/businesses", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ services: cleaned }),
    });
    const json = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(json.error ?? "Could not save services");
      return;
    }
    onDone(json.business);
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">What services do you offer?</h2>
      <p className="text-sm text-slate-600">
        The AI uses these to answer questions and book appointments.
      </p>
      <div className="space-y-2">
        {services.map((s, i) => (
          <div key={s.id} className="flex gap-2">
            <input
              placeholder="Service name"
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
              min={5}
              step={5}
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
              className="rounded-md border border-slate-300 px-2 text-slate-500 hover:bg-slate-100"
            >
              ×
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() =>
          setServices([
            ...services,
            { id: String(Date.now()), name: "", duration_min: 30 },
          ])
        }
        className="text-sm font-medium text-brand-600 hover:underline"
      >
        + Add service
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div>
        <button
          onClick={submit}
          disabled={loading}
          className="rounded-md bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {loading ? "Saving…" : "Continue"}
        </button>
      </div>
    </div>
  );
}

function ProvisionStep({
  business,
  onDone,
}: {
  business: Business;
  onDone: (b: Business) => void;
}) {
  const [areaCode, setAreaCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/onboarding/provision", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ areaCode: areaCode || undefined }),
    });
    const json = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(json.error ?? "Could not provision number");
      return;
    }
    onDone(json.business);
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Get your AI receptionist a phone number</h2>
      <p className="text-sm text-slate-600">
        We'll create a Vapi assistant for {business.name} and assign it a phone number.
      </p>
      <div>
        <label className="block text-sm font-medium">Preferred area code (optional)</label>
        <input
          value={areaCode}
          onChange={(e) => setAreaCode(e.target.value)}
          placeholder="e.g. 415"
          className="mt-1 w-32 rounded-md border border-slate-300 px-3 py-2"
        />
      </div>
      {business.phone_number && (
        <p className="text-sm text-emerald-700">
          Already provisioned: <code>{business.phone_number}</code>
        </p>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        onClick={submit}
        disabled={loading}
        className="rounded-md bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-700 disabled:opacity-60"
      >
        {loading ? "Provisioning…" : business.phone_number ? "Continue" : "Provision number"}
      </button>
    </div>
  );
}

function TelegramStep({ business, onDone }: { business: Business; onDone: () => void }) {
  const link =
    business.telegram_link_token && process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME
      ? `https://t.me/${process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME}?start=${business.telegram_link_token}`
      : null;
  const [polling, setPolling] = useState(false);
  const [linked, setLinked] = useState(Boolean(business.telegram_chat_id));

  async function check() {
    setPolling(true);
    try {
      const res = await fetch(`/api/businesses/me`);
      const json = await res.json();
      if (json.business?.telegram_chat_id) setLinked(true);
    } finally {
      setPolling(false);
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Get notified on Telegram</h2>
      <p className="text-sm text-slate-600">
        After every call we'll send you a summary on Telegram. Tap the link below to connect.
      </p>
      {link ? (
        <a
          href={link}
          target="_blank"
          rel="noreferrer"
          className="inline-block rounded-md bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-700"
        >
          Open Telegram bot
        </a>
      ) : (
        <p className="text-sm text-red-600">
          Telegram bot username is not configured on the server.
        </p>
      )}
      <div className="text-sm">
        {linked ? (
          <p className="text-emerald-700">✓ Telegram linked.</p>
        ) : (
          <button onClick={check} className="text-brand-600 hover:underline" disabled={polling}>
            {polling ? "Checking…" : "I've messaged the bot — check now"}
          </button>
        )}
      </div>
      <button
        onClick={onDone}
        disabled={!linked}
        className="rounded-md bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-700 disabled:opacity-60"
      >
        Go to dashboard
      </button>
    </div>
  );
}
