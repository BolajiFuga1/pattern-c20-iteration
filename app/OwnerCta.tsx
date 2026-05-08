"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase-config";
import { OWNER_EMAIL, OWNER_PASSWORD } from "@/lib/owner-account";

export default function OwnerCta({ className }: { className?: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function go() {
    setLoading(true);
    setError(null);
    try {
      const supabase = getSupabaseBrowserClient();
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
      router.push("/dashboard");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={go}
        disabled={loading}
        className="rounded-md bg-slate-900 px-6 py-3 font-medium text-white hover:bg-slate-800 disabled:opacity-60"
      >
        {loading ? "Signing you in…" : "Continue as owner →"}
      </button>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
