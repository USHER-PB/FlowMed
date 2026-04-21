import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRedisClient } from "@/lib/redis";

const startTime = Date.now();

export async function GET() {
  const timestamp = new Date().toISOString();
  const uptime = Math.floor((Date.now() - startTime) / 1000);

  // Check database
  let databaseStatus: "connected" | "disconnected" = "disconnected";
  try {
    await prisma.$queryRaw`SELECT 1`;
    databaseStatus = "connected";
  } catch {
    // database unreachable
  }

  // Check Redis
  let redisStatus: "connected" | "disconnected" = "disconnected";
  try {
    const redis = getRedisClient();
    const probe = "__health_probe__";
    await redis.set(probe, "1", "EX", 5);
    const val = await redis.get(probe);
    if (val === "1") redisStatus = "connected";
  } catch {
    // redis unreachable
  }

  const healthy = databaseStatus === "connected" && redisStatus === "connected";

  return NextResponse.json(
    {
      status: healthy ? "ok" : "degraded",
      database: databaseStatus,
      redis: redisStatus,
      uptime,
      timestamp,
    },
    { status: healthy ? 200 : 503 }
  );
}
