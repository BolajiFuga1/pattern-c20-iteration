import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentBusiness, getCurrentUserOrRedirect } from "@/lib/auth";
import SignOutButton from "./SignOutButton";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  await getCurrentUserOrRedirect();
  const { business } = await getCurrentBusiness();
  if (!business) redirect("/onboarding");

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/dashboard" className="text-base font-semibold tracking-tight">
            {business.name}
          </Link>
          <nav className="flex items-center gap-5 text-sm">
            <Link href="/dashboard" className="text-slate-700 hover:text-slate-900">Overview</Link>
            <Link href="/dashboard/calls" className="text-slate-700 hover:text-slate-900">Calls</Link>
            <Link href="/dashboard/bookings" className="text-slate-700 hover:text-slate-900">Bookings</Link>
            <Link href="/dashboard/settings" className="text-slate-700 hover:text-slate-900">Settings</Link>
            <SignOutButton />
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
