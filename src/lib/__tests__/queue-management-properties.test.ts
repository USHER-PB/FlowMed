/**
 * Property-based tests for queue management
 * **Validates: Requirements F3.2 - Queue ordering**
 */

import { describe, it, expect } from '@jest/globals';
import * as fc from 'fast-check';
import { QueueStatus, ProviderTier } from '@prisma/client';

// Mock queue data structures
interface QueueItem {
  id: string;
  appointmentId: string;
  patientId: string;
  providerId: string;
  position: number;
  status: QueueStatus;
  isUrgent: boolean;
  urgencyReason?: string;
  urgencyApproved?: boolean;
  appointmentTime: Date;
  estimatedWaitMinutes: number;
}

interface Provider {
  id: string;
  tier: ProviderTier;
}

// Mock queue management system
class MockQueueManager {
  private queues: Map<string, QueueItem[]> = new Map();
  private providers: Map<string, Provider> = new Map();

  addProvider(provider: Provider) {
    this.providers.set(provider.id, provider);
    if (!this.queues.has(provider.id)) {
      this.queues.set(provider.id, []);
    }
  }

  addToQueue(item: Omit<QueueItem, 'position' | 'estimatedWaitMinutes'>): QueueItem {
    const queue = this.queues.get(item.providerId) || [];
    
    // Calculate position based on appointment time and urgency
    let position = 1;
    for (const existingItem of queue) {
      if (existingItem.status === QueueStatus.WAITING) {
        if (!item.isUrgent || !existingItem.isUrgent) {
          if (item.appointmentTime > existingItem.appointmentTime) {
            position++;
          }
        } else {
          // Both urgent - maintain appointment time order
          if (item.appointmentTime > existingItem.appointmentTime) {
            position++;
          }
        }
      }
    }

    const queueItem: QueueItem = {
      ...item,
      position,
      estimatedWaitMinutes: this.calculateWaitTime(item.providerId, position)
    };

    queue.push(queueItem);
    this.reorderQueue(item.providerId);
    
    return queueItem;
  }

  markUrgent(appointmentId: string, reason: string, markedByTier: ProviderTier): { success: boolean; error?: string } {
    // Only Tier 2 nurses can mark urgent
    if (markedByTier !== ProviderTier.TIER_2_NURSE) {
      return { success: false, error: 'Only Tier 2 nurses can mark urgent cases' };
    }

    for (const [providerId, queue] of this.queues) {
      const item = queue.find(q => q.appointmentId === appointmentId);
      if (item) {
        item.isUrgent = true;
        item.urgencyReason = reason;
        item.urgencyApproved = false; // Requires doctor approval
        return { success: true };
      }
    }

    return { success: false, error: 'Appointment not found' };
  }

  approveUrgency(appointmentId: string, approved: boolean, approvedByTier: ProviderTier): { success: boolean; error?: string } {
    // Only Tier 1 doctors can approve urgency
    if (approvedByTier !== ProviderTier.TIER_1_DOCTOR) {
      return { success: false, error: 'Only Tier 1 doctors can approve urgent cases' };
    }

    for (const [providerId, queue] of this.queues) {
      const item = queue.find(q => q.appointmentId === appointmentId && q.isUrgent);
      if (item) {
        item.urgencyApproved = approved;
        if (approved) {
          this.reorderQueue(providerId);
        } else {
          item.isUrgent = false;
          item.urgencyReason = undefined;
          this.reorderQueue(providerId);
        }
        return { success: true };
      }
    }

    return { success: false, error: 'Urgent appointment not found' };
  }

  updateStatus(appointmentId: string, status: QueueStatus): boolean {
    for (const [providerId, queue] of this.queues) {
      const item = queue.find(q => q.appointmentId === appointmentId);
      if (item) {
        item.status = status;
        this.reorderQueue(providerId);
        return true;
      }
    }
    return false;
  }

  getQueue(providerId: string): QueueItem[] {
    return [...(this.queues.get(providerId) || [])].sort((a, b) => a.position - b.position);
  }

  getQueuePosition(appointmentId: string): number | null {
    for (const queue of this.queues.values()) {
      const item = queue.find(q => q.appointmentId === appointmentId);
      if (item) {
        return item.position;
      }
    }
    return null;
  }

  private reorderQueue(providerId: string) {
    const queue = this.queues.get(providerId) || [];
    
    // Separate by status and urgency
    const waiting = queue.filter(q => q.status === QueueStatus.WAITING);
    const inConsultation = queue.filter(q => q.status === QueueStatus.IN_CONSULTATION);
    const completed = queue.filter(q => q.status === QueueStatus.COMPLETED);

    // Sort waiting items: urgent approved first, then by appointment time
    waiting.sort((a, b) => {
      // Urgent approved items go first
      if (a.isUrgent && a.urgencyApproved && (!b.isUrgent || !b.urgencyApproved)) return -1;
      if (b.isUrgent && b.urgencyApproved && (!a.isUrgent || !a.urgencyApproved)) return 1;
      
      // Then by appointment time
      return a.appointmentTime.getTime() - b.appointmentTime.getTime();
    });

    // Assign positions
    let position = 1;
    
    // In consultation items get position 0 (currently being seen)
    inConsultation.forEach(item => {
      item.position = 0;
    });

    // Waiting items get sequential positions
    waiting.forEach(item => {
      item.position = position++;
      item.estimatedWaitMinutes = this.calculateWaitTime(providerId, item.position);
    });

    // Completed items get high positions (out of active queue)
    completed.forEach(item => {
      item.position = 999;
    });
  }

  private calculateWaitTime(providerId: string, position: number): number {
    // Estimate 15 minutes per consultation
    const avgConsultationMinutes = 15;
    return Math.max(0, (position - 1) * avgConsultationMinutes);
  }

  clear() {
    this.queues.clear();
    this.providers.clear();
  }
}

describe('Queue Management Properties', () => {
  let queueManager: MockQueueManager;

  beforeEach(() => {
    queueManager = new MockQueueManager();
  });

  describe('Property 4: Queue position consistency', () => {
    it('should maintain correct position order based on appointment time', async () => {
      await fc.assert(
        fc.property(
          fc.uuid(), // providerId
          fc.array(
            fc.record({
              appointmentId: fc.uuid(),
              patientId: fc.uuid(),
              appointmentTime: fc.date({ min: new Date(), max: new Date(Date.now() + 24 * 60 * 60 * 1000) })
            }),
            { minLength: 2, maxLength: 10 }
          ),
          (providerId, appointments) => {
            // Add provider
            queueManager.addProvider({ id: providerId, tier: ProviderTier.TIER_1_DOCTOR });

            // Add appointments to queue
            const queueItems = appointments.map(apt => 
              queueManager.addToQueue({
                id: `queue-${apt.appointmentId}`,
                appointmentId: apt.appointmentId,
                patientId: apt.patientId,
                providerId,
                status: QueueStatus.WAITING,
                isUrgent: false,
                appointmentTime: apt.appointmentTime
              })
            );

            const queue = queueManager.getQueue(providerId);
            const waitingItems = queue.filter(q => q.status === QueueStatus.WAITING);

            // Verify positions are sequential starting from 1
            waitingItems.forEach((item, index) => {
              expect(item.position).toBe(index + 1);
            });

            // Verify appointment times are in order
            for (let i = 1; i < waitingItems.length; i++) {
              expect(waitingItems[i].appointmentTime.getTime())
                .toBeGreaterThanOrEqual(waitingItems[i - 1].appointmentTime.getTime());
            }

            queueManager.clear();
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should move urgent approved cases to front while maintaining relative order', async () => {
      await fc.assert(
        fc.property(
          fc.uuid(), // providerId
          fc.array(
            fc.record({
              appointmentId: fc.uuid(),
              patientId: fc.uuid(),
              appointmentTime: fc.date({ min: new Date(), max: new Date(Date.now() + 24 * 60 * 60 * 1000) })
            }),
            { minLength: 3, maxLength: 8 }
          ),
          fc.integer({ min: 0, max: 2 }), // Index of appointment to make urgent
          (providerId, appointments, urgentIndex) => {
            if (urgentIndex >= appointments.length) return;

            // Add provider
            queueManager.addProvider({ id: providerId, tier: ProviderTier.TIER_1_DOCTOR });

            // Add appointments to queue
            appointments.forEach(apt => 
              queueManager.addToQueue({
                id: `queue-${apt.appointmentId}`,
                appointmentId: apt.appointmentId,
                patientId: apt.patientId,
                providerId,
                status: QueueStatus.WAITING,
                isUrgent: false,
                appointmentTime: apt.appointmentTime
              })
            );

            // Mark one as urgent and approve it
            const urgentAppointment = appointments[urgentIndex];
            const markResult = queueManager.markUrgent(urgentAppointment.appointmentId, 'Emergency', ProviderTier.TIER_2_NURSE);
            expect(markResult.success).toBe(true);

            const approveResult = queueManager.approveUrgency(urgentAppointment.appointmentId, true, ProviderTier.TIER_1_DOCTOR);
            expect(approveResult.success).toBe(true);

            const queue = queueManager.getQueue(providerId);
            const waitingItems = queue.filter(q => q.status === QueueStatus.WAITING);

            // Urgent approved item should be first
            expect(waitingItems[0].appointmentId).toBe(urgentAppointment.appointmentId);
            expect(waitingItems[0].position).toBe(1);

            // Other items should maintain relative order
            const nonUrgentItems = waitingItems.slice(1);
            for (let i = 1; i < nonUrgentItems.length; i++) {
              expect(nonUrgentItems[i].appointmentTime.getTime())
                .toBeGreaterThanOrEqual(nonUrgentItems[i - 1].appointmentTime.getTime());
            }

            queueManager.clear();
          }
        ),
        { numRuns: 15 }
      );
    });

    it('should recalculate positions when status changes', async () => {
      await fc.assert(
        fc.property(
          fc.uuid(),
          fc.array(fc.uuid(), { minLength: 3, maxLength: 6 }), // appointmentIds
          fc.integer({ min: 0, max: 2 }), // Index to move to consultation
          (providerId, appointmentIds, consultationIndex) => {
            if (consultationIndex >= appointmentIds.length) return;

            // Add provider
            queueManager.addProvider({ id: providerId, tier: ProviderTier.TIER_1_DOCTOR });

            // Add appointments with sequential times
            const baseTime = new Date();
            appointmentIds.forEach((aptId, index) => {
              const appointmentTime = new Date(baseTime.getTime() + index * 60 * 60 * 1000); // 1 hour apart
              queueManager.addToQueue({
                id: `queue-${aptId}`,
                appointmentId: aptId,
                patientId: `patient-${index}`,
                providerId,
                status: QueueStatus.WAITING,
                isUrgent: false,
                appointmentTime
              });
            });

            // Move one to consultation
            const consultationAppointmentId = appointmentIds[consultationIndex];
            queueManager.updateStatus(consultationAppointmentId, QueueStatus.IN_CONSULTATION);

            const queue = queueManager.getQueue(providerId);
            const inConsultation = queue.filter(q => q.status === QueueStatus.IN_CONSULTATION);
            const waiting = queue.filter(q => q.status === QueueStatus.WAITING);

            // In consultation should have position 0
            expect(inConsultation).toHaveLength(1);
            expect(inConsultation[0].position).toBe(0);

            // Waiting items should have sequential positions starting from 1
            waiting.forEach((item, index) => {
              expect(item.position).toBe(index + 1);
            });

            queueManager.clear();
          }
        ),
        { numRuns: 15 }
      );
    });
  });

  describe('Urgency Approval Properties', () => {
    it('should require doctor approval for urgent case reordering', async () => {
      await fc.assert(
        fc.property(
          fc.uuid(), // providerId
          fc.uuid(), // appointmentId
          fc.string({ minLength: 5, maxLength: 100 }), // urgency reason
          fc.constantFrom(...Object.values(ProviderTier)),
          (providerId, appointmentId, reason, approverTier) => {
            // Add provider and appointment
            queueManager.addProvider({ id: providerId, tier: ProviderTier.TIER_1_DOCTOR });
            queueManager.addToQueue({
              id: `queue-${appointmentId}`,
              appointmentId,
              patientId: 'patient-1',
              providerId,
              status: QueueStatus.WAITING,
              isUrgent: false,
              appointmentTime: new Date()
            });

            // Mark as urgent (by nurse)
            const markResult = queueManager.markUrgent(appointmentId, reason, ProviderTier.TIER_2_NURSE);
            expect(markResult.success).toBe(true);

            // Try to approve with different tiers
            const approveResult = queueManager.approveUrgency(appointmentId, true, approverTier);

            if (approverTier === ProviderTier.TIER_1_DOCTOR) {
              expect(approveResult.success).toBe(true);
            } else {
              expect(approveResult.success).toBe(false);
              expect(approveResult.error).toBe('Only Tier 1 doctors can approve urgent cases');
            }

            queueManager.clear();
          }
        ),
        { numRuns: 25 }
      );
    });

    it('should only allow Tier 2 nurses to mark urgent cases', async () => {
      await fc.assert(
        fc.property(
          fc.uuid(),
          fc.uuid(),
          fc.string({ minLength: 5, maxLength: 100 }),
          fc.constantFrom(...Object.values(ProviderTier)),
          (providerId, appointmentId, reason, markerTier) => {
            // Add provider and appointment
            queueManager.addProvider({ id: providerId, tier: ProviderTier.TIER_1_DOCTOR });
            queueManager.addToQueue({
              id: `queue-${appointmentId}`,
              appointmentId,
              patientId: 'patient-1',
              providerId,
              status: QueueStatus.WAITING,
              isUrgent: false,
              appointmentTime: new Date()
            });

            const markResult = queueManager.markUrgent(appointmentId, reason, markerTier);

            if (markerTier === ProviderTier.TIER_2_NURSE) {
              expect(markResult.success).toBe(true);
            } else {
              expect(markResult.success).toBe(false);
              expect(markResult.error).toBe('Only Tier 2 nurses can mark urgent cases');
            }

            queueManager.clear();
          }
        ),
        { numRuns: 25 }
      );
    });

    it('should not reorder queue until urgency is approved', async () => {
      const providerId = 'provider-1';
      const appointments = [
        { id: 'apt-1', time: new Date(Date.now() + 60 * 60 * 1000) }, // 1 hour from now
        { id: 'apt-2', time: new Date(Date.now() + 30 * 60 * 1000) }, // 30 min from now (earlier)
        { id: 'apt-3', time: new Date(Date.now() + 90 * 60 * 1000) }  // 1.5 hours from now
      ];

      // Add provider
      queueManager.addProvider({ id: providerId, tier: ProviderTier.TIER_1_DOCTOR });

      // Add appointments (apt-2 should be first due to earlier time)
      appointments.forEach(apt => {
        queueManager.addToQueue({
          id: `queue-${apt.id}`,
          appointmentId: apt.id,
          patientId: `patient-${apt.id}`,
          providerId,
          status: QueueStatus.WAITING,
          isUrgent: false,
          appointmentTime: apt.time
        });
      });

      let queue = queueManager.getQueue(providerId);
      expect(queue[0].appointmentId).toBe('apt-2'); // Earliest appointment first

      // Mark apt-1 as urgent (but not approved yet)
      queueManager.markUrgent('apt-1', 'Emergency', ProviderTier.TIER_2_NURSE);
      
      queue = queueManager.getQueue(providerId);
      expect(queue[0].appointmentId).toBe('apt-2'); // Should still be first (not approved)

      // Approve urgency
      queueManager.approveUrgency('apt-1', true, ProviderTier.TIER_1_DOCTOR);
      
      queue = queueManager.getQueue(providerId);
      expect(queue[0].appointmentId).toBe('apt-1'); // Now should be first
    });
  });

  describe('Wait Time Calculation Properties', () => {
    it('should calculate wait times based on queue position', async () => {
      await fc.assert(
        fc.property(
          fc.uuid(),
          fc.integer({ min: 1, max: 10 }), // number of appointments
          (providerId, numAppointments) => {
            // Add provider
            queueManager.addProvider({ id: providerId, tier: ProviderTier.TIER_1_DOCTOR });

            // Add appointments
            const baseTime = new Date();
            for (let i = 0; i < numAppointments; i++) {
              const appointmentTime = new Date(baseTime.getTime() + i * 30 * 60 * 1000); // 30 min apart
              queueManager.addToQueue({
                id: `queue-apt-${i}`,
                appointmentId: `apt-${i}`,
                patientId: `patient-${i}`,
                providerId,
                status: QueueStatus.WAITING,
                isUrgent: false,
                appointmentTime
              });
            }

            const queue = queueManager.getQueue(providerId);
            const waitingItems = queue.filter(q => q.status === QueueStatus.WAITING);

            // Wait times should increase with position
            for (let i = 1; i < waitingItems.length; i++) {
              expect(waitingItems[i].estimatedWaitMinutes)
                .toBeGreaterThan(waitingItems[i - 1].estimatedWaitMinutes);
            }

            // First person should have 0 wait time
            expect(waitingItems[0].estimatedWaitMinutes).toBe(0);

            queueManager.clear();
          }
        ),
        { numRuns: 15 }
      );
    });
  });
});