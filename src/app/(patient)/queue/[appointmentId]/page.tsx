import QueueStatus from "@/components/patient/QueueStatus";
import Link from "next/link";

interface PageProps {
  params: { appointmentId: string };
}

export default function QueuePage({ params }: PageProps) {
  return (
    <div className="space-y-6 max-w-md mx-auto">
      <div className="flex items-center gap-3">
        <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-700">
          ← Dashboard
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Queue Status</h1>
        <p className="text-gray-500 text-sm mt-1">
          Real-time updates for your appointment.
        </p>
      </div>

      <QueueStatus appointmentId={params.appointmentId} />

      <p className="text-xs text-center text-gray-400">
        Updates automatically when your position changes.
      </p>
    </div>
  );
}
