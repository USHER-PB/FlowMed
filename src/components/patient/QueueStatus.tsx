"use client";

import { useEffect, useState, useRef } from "react";
import { io, Socket } from "socket.io-client";

interface QueueData {
  queueItemId: string;
  position: number;
  estimatedWaitMinutes: number;
  status: string;
  isUrgent: boolean;
  providerId: string;
}

interface QueueUpdatePayload {
  queueItemId: string;
  position: number;
  estimatedWaitMinutes: number;
  status: string;
}

interface QueueStatusProps {
  appointmentId: string;
}

const STATUS_LABELS: Record<string, string> = {
  WAITING: "Waiting",
  IN_CONSULTATION: "In Consultation",
  COMPLETED: "Completed",
};

const STATUS_COLORS: Record<string, string> = {
  WAITING: "text-yellow-700 bg-yellow-50 border-yellow-200",
  IN_CONSULTATION: "text-blue-700 bg-blue-50 border-blue-200",
  COMPLETED: "text-green-700 bg-green-50 border-green-200",
};

export default function QueueStatus({ appointmentId }: QueueStatusProps) {
  const [queue, setQueue] = useState<QueueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  // Initial fetch
  useEffect(() => {
    async function fetchPosition() {
      try {
        const res = await fetch(`/api/queue/${appointmentId}/position`);
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error ?? "Failed to load queue position");
        }
        const data: QueueData = await res.json();
        setQueue(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load queue");
      } finally {
        setLoading(false);
      }
    }
    fetchPosition();
  }, [appointmentId]);

  // Socket.io real-time updates
  useEffect(() => {
    if (!queue?.providerId) return;

    const socket: Socket = io({ path: "/api/socket" });
    socketRef.current = socket;

    socket.on("connect", () => {
      setConnected(true);
      socket.emit("join_queue", { providerId: queue.providerId });
    });

    socket.on("disconnect", () => {
      setConnected(false);
    });

    socket.on("queue_update", (payload: QueueUpdatePayload) => {
      if (payload.queueItemId === queue.queueItemId) {
        setQueue((prev) =>
          prev
            ? {
                ...prev,
                position: payload.position,
                estimatedWaitMinutes: payload.estimatedWaitMinutes,
                status: payload.status,
              }
            : prev
        );
      }
    });

    return () => {
      socket.emit("leave_queue", { providerId: queue.providerId });
      socket.disconnect();
    };
  }, [queue?.providerId, queue?.queueItemId]);

  if (loading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6 text-center text-gray-500 text-sm">
        Loading queue status...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 text-sm">
        {error}
      </div>
    );
  }

  if (!queue) return null;

  const statusClass = STATUS_COLORS[queue.status] ?? "text-gray-700 bg-gray-50 border-gray-200";

  return (
    <div className={`rounded-lg border p-6 ${statusClass}`}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Queue Status</h2>
        <div className="flex items-center gap-1.5 text-xs">
          <span
            className={`inline-block w-2 h-2 rounded-full ${
              connected ? "bg-green-500" : "bg-gray-400"
            }`}
          />
          {connected ? "Live" : "Offline"}
        </div>
      </div>

      {queue.status === "COMPLETED" ? (
        <p className="text-center text-lg font-medium">Consultation completed ✓</p>
      ) : queue.status === "IN_CONSULTATION" ? (
        <p className="text-center text-lg font-medium">You are currently in consultation</p>
      ) : (
        <div className="text-center space-y-3">
          <div>
            <div className="text-5xl font-bold">#{queue.position}</div>
            <div className="text-sm mt-1 opacity-80">Your position in queue</div>
          </div>
          <div className="border-t border-current opacity-20" />
          <div>
            <div className="text-2xl font-semibold">
              ~{queue.estimatedWaitMinutes} min
            </div>
            <div className="text-sm opacity-80">Estimated wait time</div>
          </div>
          {queue.isUrgent && (
            <div className="text-xs font-medium bg-red-100 text-red-700 rounded px-2 py-1 inline-block">
              Urgent case
            </div>
          )}
        </div>
      )}

      <div className="mt-4 text-center">
        <span className="text-xs px-2 py-1 rounded-full border font-medium">
          {STATUS_LABELS[queue.status] ?? queue.status}
        </span>
      </div>
    </div>
  );
}
