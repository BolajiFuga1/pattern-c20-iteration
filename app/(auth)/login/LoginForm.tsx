"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase-config";
import { OWNER_EMAIL, OWNER_PASSWORD } from "@/lib/owner-account";

export default function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get("next") ?? "/dashboard";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [ownerLoading, setOwnerLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.push(next);
    router.refresh();
  }

  async function continueAsOwner() {
    setOwnerLoading(true);
    setError(null);
    try {
      const supabase = getSupabaseBrowserClient();
      // Try sign-in first; if the owner account doesn't exist yet, ensure it via
      // the auto-signup edge function and then sign in.
      let { error: signInErr } = await supabase.auth.signInWithPassword({
        email: OWNER_EMAIL,
        password: OWNER_PASSWORD,
      });
      if (signInErr) {
        await fetch(`${getSupabaseUrl()}/functions/v1/auto-signup`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${getSupabaseAnonKey()}`,
          },
          body: JSON.stringify({ email: OWNER_EMAIL, password: OWNER_PASSWORD }),
        });
        ({ error: signInErr } = await supabase.auth.signInWithPassword({
          email: OWNER_EMAIL,
          password: OWNER_PASSWORD,
        }));
      }
      if (signInErr) {
        setError(signInErr.message);
        return;
      }
      router.push(next);
      router.refresh();
    } finally {
      setOwnerLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <h1 className="text-2xl font-semibold">Sign in</h1>
      <p className="mt-1 text-sm text-slate-600">Welcome back to your AI receptionist dashboard.</p>

      <button
        type="button"
        onClick={continueAsOwner}
        disabled={ownerLoading}
        className="mt-6 w-full rounded-md bg-slate-900 py-2.5 font-medium text-white hover:bg-slate-800 disabled:opacity-60"
      >
        {ownerLoading ? "Signing you in…" : "Continue as owner →"}
      </button>
      <p className="mt-2 text-center text-xs text-slate-500">
        One-click sign-in for your demo account
      </p>

      <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-wide text-slate-400">
        <div className="h-px flex-1 bg-slate-200" /> or use email <div className="h-px flex-1 bg-slate-200" />
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Password</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-brand-600 py-2 font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p className="mt-6 text-sm text-slate-600">
        New here?{" "}
        <Link href="/signup" className="font-medium text-brand-600 hover:underline">
          Create an account
        </Link>
      </p>
    </main>
  );
}
