import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/middleware";
import { decrypt } from "@/lib/encryption";

/**
 * GET /api/diagnoses/[id]/pdf
 *
 * Returns a printable HTML page for a diagnosis record.
 * Accessible by the patient who owns the diagnosis or the treating provider.
 * Creates an audit log entry on access (P4.7).
 *
 * Requirements: F4.1, F4.2 — P4.5, P4.7
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireAuth(req);
  if (auth.error) return auth.error;

  const { id } = await params;

  try {
    const diagnosis = await prisma.diagnosis.findUnique({
      where: { id },
      include: {
        provider: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            tier: true,
            specialty: true,
            userId: true,
          },
        },
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            userId: true,
            dateOfBirth: true,
          },
        },
        supervisor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            tier: true,
          },
        },
        appointment: {
          select: {
            dateTime: true,
          },
        },
      },
    });

    if (!diagnosis) {
      return NextResponse.json({ error: "Diagnosis not found" }, { status: 404 });
    }

    const { user } = auth;

    // Access control: patient or treating provider only (P4.1, P4.5)
    const isPatient =
      user.role === "PATIENT" && diagnosis.patient.userId === user.userId;
    const isProvider =
      user.role === "PROVIDER" && diagnosis.provider.userId === user.userId;

    if (!isPatient && !isProvider) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Decrypt sensitive fields
    let diagnosisText: string;
    let prescriptions: unknown[] = [];

    try {
      diagnosisText = diagnosis.encrypted
        ? decrypt(diagnosis.diagnosisText)
        : diagnosis.diagnosisText;
    } catch {
      return NextResponse.json({ error: "Failed to decrypt diagnosis data" }, { status: 500 });
    }

    if (diagnosis.prescriptions) {
      try {
        const raw = diagnosis.encrypted
          ? decrypt(diagnosis.prescriptions)
          : diagnosis.prescriptions;
        prescriptions = JSON.parse(raw);
      } catch {
        prescriptions = [];
      }
    }

    // Audit log (P4.7)
    await prisma.auditLog.create({
      data: {
        userId: user.userId,
        action: "DOWNLOAD_DIAGNOSIS_PDF",
        entityType: "Diagnosis",
        entityId: diagnosis.id,
        metadata: JSON.stringify({ patientId: diagnosis.patientId }),
        ipAddress:
          req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? null,
      },
    });

    const tierLabel: Record<string, string> = {
      TIER_1_DOCTOR: "Licensed Doctor",
      TIER_2_NURSE: "Licensed Nurse",
      TIER_3_CERTIFIED_WORKER: "Certified Healthcare Worker",
      TIER_4_STUDENT: "Medical/Nursing Student",
      TIER_5_VOLUNTEER: "Community Health Volunteer",
    };

    const providerTierLabel = tierLabel[diagnosis.provider.tier] ?? diagnosis.provider.tier;
    const supervisorTierLabel = diagnosis.supervisor
      ? (tierLabel[diagnosis.supervisor.tier] ?? diagnosis.supervisor.tier)
      : null;

    const visitDate = diagnosis.appointment?.dateTime
      ? new Date(diagnosis.appointment.dateTime).toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "long",
          year: "numeric",
        })
      : "N/A";

    const issuedDate = new Date(diagnosis.createdAt).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });

    const prescriptionsHtml =
      Array.isArray(prescriptions) && prescriptions.length > 0
        ? `
        <section>
          <h2>Prescriptions</h2>
          <table>
            <thead>
              <tr>
                <th>Drug Name</th>
                <th>Dosage</th>
                <th>Duration</th>
                <th>Instructions</th>
              </tr>
            </thead>
            <tbody>
              ${(prescriptions as Array<Record<string, string>>)
                .map(
                  (p) => `
                <tr>
                  <td>${escapeHtml(p.drugName ?? "")}</td>
                  <td>${escapeHtml(p.dosage ?? "")}</td>
                  <td>${escapeHtml(p.duration ?? "")}</td>
                  <td>${escapeHtml(p.instructions ?? "")}</td>
                </tr>`
                )
                .join("")}
            </tbody>
          </table>
        </section>`
        : "";

    const supervisorHtml = diagnosis.supervisor
      ? `<p><strong>Supervised by:</strong> Dr. ${escapeHtml(diagnosis.supervisor.firstName)} ${escapeHtml(diagnosis.supervisor.lastName)} (${supervisorTierLabel})</p>`
      : "";

    const followUpHtml = diagnosis.followUpDate
      ? `<p><strong>Follow-up Date:</strong> ${new Date(diagnosis.followUpDate).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })}</p>`
      : "";

    const recommendationsHtml = diagnosis.recommendations
      ? `
        <section>
          <h2>Recommendations</h2>
          <p>${escapeHtml(diagnosis.recommendations)}</p>
        </section>`
      : "";

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Diagnosis Record — ${escapeHtml(diagnosis.patient.firstName)} ${escapeHtml(diagnosis.patient.lastName)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: Georgia, "Times New Roman", serif;
      font-size: 14px;
      color: #1a1a1a;
      background: #fff;
      padding: 40px;
      max-width: 800px;
      margin: 0 auto;
    }
    header {
      border-bottom: 2px solid #1a1a1a;
      padding-bottom: 16px;
      margin-bottom: 24px;
    }
    header h1 {
      font-size: 22px;
      letter-spacing: 0.5px;
    }
    header p {
      font-size: 12px;
      color: #555;
      margin-top: 4px;
    }
    .meta-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px 24px;
      margin-bottom: 24px;
      padding: 16px;
      background: #f9f9f9;
      border: 1px solid #ddd;
      border-radius: 4px;
    }
    .meta-grid p { font-size: 13px; }
    section {
      margin-bottom: 24px;
    }
    section h2 {
      font-size: 15px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 1px solid #ccc;
      padding-bottom: 6px;
      margin-bottom: 12px;
    }
    section p {
      line-height: 1.7;
      white-space: pre-wrap;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }
    th, td {
      border: 1px solid #ccc;
      padding: 8px 10px;
      text-align: left;
    }
    th { background: #f0f0f0; font-weight: bold; }
    footer {
      margin-top: 40px;
      border-top: 1px solid #ccc;
      padding-top: 12px;
      font-size: 11px;
      color: #888;
    }
    @media print {
      body { padding: 20px; }
      @page { margin: 20mm; }
    }
  </style>
</head>
<body>
  <header>
    <h1>Cameroon Healthcare Marketplace</h1>
    <p>Official Diagnosis Record — Confidential Medical Document</p>
  </header>

  <div class="meta-grid">
    <p><strong>Patient:</strong> ${escapeHtml(diagnosis.patient.firstName)} ${escapeHtml(diagnosis.patient.lastName)}</p>
    <p><strong>Visit Date:</strong> ${visitDate}</p>
    <p><strong>Provider:</strong> ${escapeHtml(diagnosis.provider.firstName)} ${escapeHtml(diagnosis.provider.lastName)}</p>
    <p><strong>Provider Tier:</strong> ${providerTierLabel}</p>
    ${diagnosis.provider.specialty ? `<p><strong>Specialty:</strong> ${escapeHtml(diagnosis.provider.specialty)}</p>` : ""}
    <p><strong>Record ID:</strong> ${escapeHtml(diagnosis.id)}</p>
    <p><strong>Issued:</strong> ${issuedDate}</p>
    ${supervisorHtml}
  </div>

  <section>
    <h2>Diagnosis</h2>
    <p>${escapeHtml(diagnosisText)}</p>
  </section>

  ${prescriptionsHtml}

  ${recommendationsHtml}

  ${followUpHtml ? `<section><h2>Follow-up</h2>${followUpHtml}</section>` : ""}

  <footer>
    <p>This document was generated by the Cameroon Healthcare Marketplace platform. Record ID: ${escapeHtml(diagnosis.id)}</p>
    <p>This is a confidential medical record. Unauthorised disclosure is prohibited.</p>
  </footer>
</body>
</html>`;

    return new NextResponse(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `inline; filename="diagnosis-${diagnosis.id}.html"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("[diagnoses/[id]/pdf GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/** Escape HTML special characters to prevent XSS in the generated document. */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
