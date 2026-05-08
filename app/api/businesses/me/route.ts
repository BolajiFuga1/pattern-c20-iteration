import { NextResponse } from "next/server";
import { getCurrentBusiness } from "@/lib/auth";

export async function GET() {
  const { business } = await getCurrentBusiness();
  return NextResponse.json({ business });
}
