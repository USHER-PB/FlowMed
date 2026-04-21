import { PrismaClient, UserRole, ProviderTier, VerificationStatus, AppointmentStatus, QueueStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // ─── Clean up existing data (order matters for FK constraints) ───────────────
  await prisma.auditLog.deleteMany();
  await prisma.diagnosis.deleteMany();
  await prisma.queueItem.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.availability.deleteMany();
  await prisma.provider.deleteMany();
  await prisma.patient.deleteMany();
  await prisma.medicalCenter.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash("Password123!", 12);

  // ─── 1. Admin user ────────────────────────────────────────────────────────────
  const adminUser = await prisma.user.create({
    data: {
      email: "admin@healthapp.cm",
      password: passwordHash,
      role: UserRole.ADMIN,
      emailVerified: true,
    },
  });
  console.log("✅ Admin user created:", adminUser.email);

  // ─── 2. Patient 1 ─────────────────────────────────────────────────────────────
  const patient1User = await prisma.user.create({
    data: {
      email: "patient1@example.cm",
      phone: "+237670000001",
      password: passwordHash,
      role: UserRole.PATIENT,
      emailVerified: true,
      phoneVerified: true,
      patient: {
        create: {
          firstName: "Amina",
          lastName: "Nkemdirim",
          dateOfBirth: new Date("1990-05-15"),
          gender: "female",
          address: "Rue de la Paix, Yaoundé",
          preferredLanguage: "fr",
        },
      },
    },
    include: { patient: true },
  });
  console.log("✅ Patient 1 created:", patient1User.email);

  // ─── 3. Patient 2 ─────────────────────────────────────────────────────────────
  const patient2User = await prisma.user.create({
    data: {
      email: "patient2@example.cm",
      phone: "+237670000002",
      password: passwordHash,
      role: UserRole.PATIENT,
      emailVerified: true,
      phoneVerified: false,
      patient: {
        create: {
          firstName: "Emmanuel",
          lastName: "Tabi",
          dateOfBirth: new Date("1985-11-22"),
          gender: "male",
          address: "Bonanjo, Douala",
          preferredLanguage: "en",
        },
      },
    },
    include: { patient: true },
  });
  console.log("✅ Patient 2 created:", patient2User.email);

  // ─── 4. Medical Center ────────────────────────────────────────────────────────
  const medicalCenterUser = await prisma.user.create({
    data: {
      email: "clinic@healthcenter.cm",
      phone: "+237222000001",
      password: passwordHash,
      role: UserRole.MEDICAL_CENTER,
      emailVerified: true,
      medicalCenter: {
        create: {
          name: "Centre de Santé Espoir",
          address: "Avenue Kennedy, Yaoundé, Cameroun",
          phone: "+237222000001",
          verificationStatus: VerificationStatus.APPROVED,
          verificationDocs: JSON.stringify(["docs/clinic-license.pdf", "docs/clinic-registration.pdf"]),
        },
      },
    },
    include: { medicalCenter: true },
  });
  const medicalCenter = medicalCenterUser.medicalCenter!;
  console.log("✅ Medical center created:", medicalCenter.name);

  // ─── 5. Tier 1 Doctor (verified) ─────────────────────────────────────────────
  const doctorUser = await prisma.user.create({
    data: {
      email: "doctor@healthapp.cm",
      phone: "+237670000010",
      password: passwordHash,
      role: UserRole.PROVIDER,
      emailVerified: true,
      phoneVerified: true,
      provider: {
        create: {
          tier: ProviderTier.TIER_1_DOCTOR,
          firstName: "Dr. Jean-Pierre",
          lastName: "Mbarga",
          specialty: "General Medicine",
          licenseNumber: "CMR-MED-2015-0042",
          verificationStatus: VerificationStatus.APPROVED,
          verificationDocs: JSON.stringify(["docs/doctor-license.pdf", "docs/doctor-id.pdf"]),
          consultationFee: 15000,
          medicalCenterId: medicalCenter.id,
        },
      },
    },
    include: { provider: true },
  });
  const doctor = doctorUser.provider!;
  console.log("✅ Tier 1 Doctor created:", doctorUser.email);

  // ─── 6. Tier 2 Nurse (verified) ───────────────────────────────────────────────
  const nurseUser = await prisma.user.create({
    data: {
      email: "nurse@healthapp.cm",
      phone: "+237670000011",
      password: passwordHash,
      role: UserRole.PROVIDER,
      emailVerified: true,
      phoneVerified: true,
      provider: {
        create: {
          tier: ProviderTier.TIER_2_NURSE,
          firstName: "Marie-Claire",
          lastName: "Fotso",
          specialty: "Prenatal Care",
          licenseNumber: "CMR-NRS-2018-0117",
          verificationStatus: VerificationStatus.APPROVED,
          verificationDocs: JSON.stringify(["docs/nurse-license.pdf", "docs/nurse-id.pdf"]),
          consultationFee: 8000,
          medicalCenterId: medicalCenter.id,
        },
      },
    },
    include: { provider: true },
  });
  const nurse = nurseUser.provider!;
  console.log("✅ Tier 2 Nurse created:", nurseUser.email);

  // ─── 7. Tier 3 Certified Worker (verified) ────────────────────────────────────
  const certWorkerUser = await prisma.user.create({
    data: {
      email: "certworker@healthapp.cm",
      phone: "+237670000012",
      password: passwordHash,
      role: UserRole.PROVIDER,
      emailVerified: true,
      provider: {
        create: {
          tier: ProviderTier.TIER_3_CERTIFIED_WORKER,
          firstName: "Paul",
          lastName: "Nganou",
          verificationStatus: VerificationStatus.APPROVED,
          verificationDocs: JSON.stringify(["docs/graduation-cert.pdf", "docs/worker-id.pdf"]),
          consultationFee: 3000,
        },
      },
    },
    include: { provider: true },
  });
  console.log("✅ Tier 3 Certified Worker created:", certWorkerUser.email);

  // ─── 8. Tier 4 Student (with supervisor linked to doctor) ─────────────────────
  const studentUser = await prisma.user.create({
    data: {
      email: "student@healthapp.cm",
      phone: "+237670000013",
      password: passwordHash,
      role: UserRole.PROVIDER,
      emailVerified: true,
      provider: {
        create: {
          tier: ProviderTier.TIER_4_STUDENT,
          firstName: "Carine",
          lastName: "Bello",
          studentYear: 4,
          supervisorId: doctor.id,
          verificationStatus: VerificationStatus.APPROVED,
          verificationDocs: JSON.stringify(["docs/student-id.pdf", "docs/enrollment-proof.pdf"]),
          consultationFee: 1500,
        },
      },
    },
    include: { provider: true },
  });
  const student = studentUser.provider!;
  console.log("✅ Tier 4 Student created:", studentUser.email, "(supervisor: Dr. Mbarga)");

  // ─── 9. Tier 5 Volunteer (verified) ───────────────────────────────────────────
  const volunteerUser = await prisma.user.create({
    data: {
      email: "volunteer@healthapp.cm",
      phone: "+237670000014",
      password: passwordHash,
      role: UserRole.PROVIDER,
      emailVerified: true,
      provider: {
        create: {
          tier: ProviderTier.TIER_5_VOLUNTEER,
          firstName: "Fatima",
          lastName: "Oumarou",
          verificationStatus: VerificationStatus.APPROVED,
          verificationDocs: JSON.stringify(["docs/training-cert.pdf", "docs/volunteer-id.pdf"]),
          consultationFee: 0,
        },
      },
    },
    include: { provider: true },
  });
  console.log("✅ Tier 5 Volunteer created:", volunteerUser.email);

  // ─── 10. Availability for Doctor (Mon–Fri 08:00–17:00) ───────────────────────
  const doctorAvailability = [1, 2, 3, 4, 5].map((day) => ({
    providerId: doctor.id,
    dayOfWeek: day,
    startTime: "08:00",
    endTime: "17:00",
  }));
  await prisma.availability.createMany({ data: doctorAvailability });
  console.log("✅ Doctor availability set (Mon–Fri 08:00–17:00)");

  // ─── 11. Availability for Nurse (Mon, Wed, Fri 09:00–15:00) ──────────────────
  const nurseAvailability = [1, 3, 5].map((day) => ({
    providerId: nurse.id,
    dayOfWeek: day,
    startTime: "09:00",
    endTime: "15:00",
  }));
  await prisma.availability.createMany({ data: nurseAvailability });
  console.log("✅ Nurse availability set (Mon/Wed/Fri 09:00–15:00)");

  // ─── 12. Sample Appointments ──────────────────────────────────────────────────
  const patient1 = patient1User.patient!;
  const patient2 = patient2User.patient!;

  // Appointment 1: Patient 1 with Doctor (completed)
  const appt1 = await prisma.appointment.create({
    data: {
      patientId: patient1.id,
      providerId: doctor.id,
      medicalCenterId: medicalCenter.id,
      dateTime: new Date("2024-07-10T09:00:00Z"),
      status: AppointmentStatus.COMPLETED,
    },
  });

  // Appointment 2: Patient 2 with Nurse (confirmed, upcoming)
  const appt2 = await prisma.appointment.create({
    data: {
      patientId: patient2.id,
      providerId: nurse.id,
      medicalCenterId: medicalCenter.id,
      dateTime: new Date("2024-08-05T10:00:00Z"),
      status: AppointmentStatus.CONFIRMED,
    },
  });

  // Appointment 3: Patient 1 with Student (pending supervisor approval)
  const appt3 = await prisma.appointment.create({
    data: {
      patientId: patient1.id,
      providerId: student.id,
      dateTime: new Date("2024-08-06T11:00:00Z"),
      status: AppointmentStatus.PENDING_SUPERVISOR_APPROVAL,
      supervisorApproved: null,
    },
  });

  // Appointment 4: Patient 2 with Doctor (confirmed, for queue demo)
  const appt4 = await prisma.appointment.create({
    data: {
      patientId: patient2.id,
      providerId: doctor.id,
      medicalCenterId: medicalCenter.id,
      dateTime: new Date("2024-08-07T09:30:00Z"),
      status: AppointmentStatus.CONFIRMED,
    },
  });

  console.log("✅ Sample appointments created");

  // ─── 13. Queue Items for upcoming appointments ────────────────────────────────
  await prisma.queueItem.create({
    data: {
      appointmentId: appt2.id,
      providerId: nurse.id,
      position: 1,
      status: QueueStatus.WAITING,
      estimatedWaitMinutes: 0,
    },
  });

  await prisma.queueItem.create({
    data: {
      appointmentId: appt4.id,
      providerId: doctor.id,
      position: 1,
      status: QueueStatus.WAITING,
      estimatedWaitMinutes: 0,
    },
  });

  console.log("✅ Queue items created");

  // ─── 14. Diagnosis for completed appointment ──────────────────────────────────
  const immutableAfter = new Date(appt1.createdAt);
  immutableAfter.setHours(immutableAfter.getHours() + 24);

  await prisma.diagnosis.create({
    data: {
      appointmentId: appt1.id,
      patientId: patient1.id,
      providerId: doctor.id,
      diagnosisText: "Patient presents with mild upper respiratory infection. No complications observed.",
      prescriptions: JSON.stringify([
        {
          drugName: "Amoxicillin",
          dosage: "500mg",
          duration: "7 days",
          instructions: "Take one capsule three times daily with food",
        },
        {
          drugName: "Paracetamol",
          dosage: "500mg",
          duration: "3 days",
          instructions: "Take one tablet every 6 hours as needed for fever",
        },
      ]),
      recommendations: "Rest for 3 days. Drink plenty of fluids. Return if symptoms worsen.",
      followUpDate: new Date("2024-07-17T09:00:00Z"),
      requiresSupervisorApproval: false,
      supervisorApproved: null,
      encrypted: true,
      immutableAfter,
    },
  });

  console.log("✅ Sample diagnosis created");

  // ─── 15. Audit log entries ────────────────────────────────────────────────────
  await prisma.auditLog.createMany({
    data: [
      {
        userId: adminUser.id,
        action: "APPROVE_VERIFICATION",
        entityType: "Provider",
        entityId: doctor.id,
        metadata: JSON.stringify({ tier: "TIER_1_DOCTOR", approvedBy: adminUser.id }),
        ipAddress: "127.0.0.1",
      },
      {
        userId: adminUser.id,
        action: "APPROVE_VERIFICATION",
        entityType: "Provider",
        entityId: nurse.id,
        metadata: JSON.stringify({ tier: "TIER_2_NURSE", approvedBy: adminUser.id }),
        ipAddress: "127.0.0.1",
      },
      {
        userId: doctorUser.id,
        action: "CREATE_DIAGNOSIS",
        entityType: "Diagnosis",
        entityId: appt1.id,
        metadata: JSON.stringify({ appointmentId: appt1.id }),
        ipAddress: "127.0.0.1",
      },
    ],
  });

  console.log("✅ Audit log entries created");
  console.log("\n🎉 Seeding complete!");
  console.log("\nSeed summary:");
  console.log("  - 1 admin user (admin@healthapp.cm)");
  console.log("  - 2 patients");
  console.log("  - 1 Tier 1 Doctor (verified, at medical center)");
  console.log("  - 1 Tier 2 Nurse (verified, at medical center)");
  console.log("  - 1 Tier 3 Certified Worker (verified)");
  console.log("  - 1 Tier 4 Student (verified, supervised by doctor)");
  console.log("  - 1 Tier 5 Volunteer (verified)");
  console.log("  - 1 Medical Center");
  console.log("  - Availability for doctor and nurse");
  console.log("  - 4 sample appointments");
  console.log("  - 2 queue items");
  console.log("  - 1 completed diagnosis with prescriptions");
  console.log("  - 3 audit log entries");
  console.log("\nDefault password for all accounts: Password123!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
