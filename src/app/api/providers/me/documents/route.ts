import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/middleware";
import { uploadDocumentsSchema, type DocumentObject } from "@/lib/validations/provider";
import logger from "@/lib/logger";

export async function POST(req: NextRequest) {
  const auth = requireRole(req, ["PROVIDER"]);
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const parsed = uploadDocumentsSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { documents } = parsed.data;

    const provider = await prisma.provider.findUnique({
      where: { userId: auth.user.userId },
      select: { id: true, verificationDocs: true, verificationStatus: true },
    });

    if (!provider) {
      return NextResponse.json({ error: "Provider profile not found" }, { status: 404 });
    }

    // Merge with existing docs
    const existingDocs: DocumentObject[] = provider.verificationDocs
      ? (() => {
          try {
            return JSON.parse(provider.verificationDocs) as DocumentObject[];
          } catch {
            return [];
          }
        })()
      : [];

    const mergedDocs = [...existingDocs, ...documents];

    // Update provider: store docs, keep verificationStatus as PENDING
    const updated = await prisma.provider.update({
      where: { id: provider.id },
      data: {
        verificationDocs: JSON.stringify(mergedDocs),
        verificationStatus: "PENDING",
      },
      select: {
        id: true,
        tier: true,
        verificationStatus: true,
        verificationDocs: true,
      },
    });

    // Audit log (P1.5)
    await prisma.auditLog.create({
      data: {
        userId: auth.user.userId,
        action: "UPLOAD_VERIFICATION_DOCS",
        entityType: "Provider",
        entityId: provider.id,
        metadata: JSON.stringify({
          uploadedCount: documents.length,
          totalDocs: mergedDocs.length,
          documentNames: documents.map((d) => d.name),
        }),
        ipAddress: req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? null,
      },
    });

    logger.info("Provider uploaded verification documents", {
      providerId: provider.id,
      userId: auth.user.userId,
      uploadedCount: documents.length,
    });

    return NextResponse.json({
      message: "Documents uploaded successfully. Verification status remains pending review.",
      provider: {
        id: updated.id,
        tier: updated.tier,
        verificationStatus: updated.verificationStatus,
        verificationDocs: (() => {
          try {
            return JSON.parse(updated.verificationDocs ?? "[]");
          } catch {
            return [];
          }
        })(),
      },
    });
  } catch (error) {
    console.error("[providers/me/documents POST]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
