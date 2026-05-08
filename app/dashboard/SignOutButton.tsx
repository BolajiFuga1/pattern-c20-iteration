"use client";

import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export default function SignOutButton() {
  const router = useRouter();
  return (
    <button
      onClick={async () => {
        await getSupabaseBrowserClient().auth.signOut();
        router.push("/");
        router.refresh();
      }}
      className="text-slate-600 hover:text-slate-900"
    >
      Sign out
    </button>
  );
}
