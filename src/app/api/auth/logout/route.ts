import { NextResponse } from "next/server";
import { clearAuthCookie } from "@/lib/auth/middleware";

export async function POST() {
  const response = NextResponse.json({ message: "Logged out successfully" });
  return clearAuthCookie(response);
}
