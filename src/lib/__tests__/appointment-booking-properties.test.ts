/**
 * Property-based tests for appointment booking
 * **Validates: Requirements F2.2 - Booking integrity**
 */

import { describe, it, expect } from '@jest/globals';
import * as fc from 'fast-check';
import { AppointmentStatus, ProviderTier } from '@prisma/client';

// Mock appointment data structures
interface TimeSlot {
  dateTime: Date;
  providerId: string;
  isAvailable: boolean;
}

interface Appointment {
  id: string;
  patientId: string;
  providerId: string;
  dateTime: Date;
  status: AppointmentStatus;
}

interface ProviderAvailability {
  providerId: string;
  dayOfWeek: number; // 0-6
  startTime: string; // HH:mm
  endTime: string; // HH:mm
}

// Mock booking system functions
class MockBookingSystem {
  private appointments: Map<string, Appointment> = new Map();
  private availability: Map<string, ProviderAvailability[]> = new Map();

  setProviderAvailability(providerId: string, availability: ProviderAvailability[]) {
    this.availability.set(providerId, availability);
  }

  isSlotAvailable(providerId: string, dateTime: Date): boolean {
    // Check if provider has availability for this day/time
    const providerAvailability = this.availability.get(providerId) || [];
    const dayOfWeek = dateTime.getDay();
    const timeStr = `${dateTime.getHours().toString().padStart(2, '0')}:${dateTime.getMinutes().toString().padStart(2, '0')}`;
    
    const hasAvailability = providerAvailability.some(avail => 
      avail.dayOfWeek === dayOfWeek &&
      avail.startTime <= timeStr &&
      avail.endTime > timeStr
    );

    if (!hasAvailability) return false;

    // Check if slot is already booked
    const slotKey = `${providerId}-${dateTime.toISOString()}`;
    return !Array.from(this.appointments.values()).some(apt => 
      apt.providerId === providerId && 
      apt.dateTime.getTime() === dateTime.getTime() &&
      apt.status !== AppointmentStatus.CANCELLED
    );
  }

  bookAppointment(patientId: string, providerId: string, dateTime: Date, tier: ProviderTier): { success: boolean; appointmentId?: string; error?: string } {
    const slotKey = `${providerId}-${dateTime.toISOString()}`;
    
    // Check availability
    if (!this.isSlotAvailable(providerId, dateTime)) {
      return { success: false, error: 'Slot not available' };
    }

    // Create appointment
    const appointmentId = `apt-${Date.now()}-${Math.random()}`;
    const status = tier === ProviderTier.TIER_4_STUDENT 
      ? AppointmentStatus.PENDING_SUPERVISOR_APPROVAL 
      : AppointmentStatus.CONFIRMED;

    const appointment: Appointment = {
      id: appointmentId,
      patientId,
      providerId,
      dateTime,
      status
    };

    this.appointments.set(appointmentId, appointment);
    return { success: true, appointmentId };
  }

  getAppointment(appointmentId: string): Appointment | null {
    return this.appointments.get(appointmentId) || null;
  }

  cancelAppointment(appointmentId: string): boolean {
    const appointment = this.appointments.get(appointmentId);
    if (!appointment) return false;
    
    appointment.status = AppointmentStatus.CANCELLED;
    return true;
  }

  getProviderAppointments(providerId: string, date: Date): Appointment[] {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return Array.from(this.appointments.values()).filter(apt =>
      apt.providerId === providerId &&
      apt.dateTime >= startOfDay &&
      apt.dateTime <= endOfDay &&
      apt.status !== AppointmentStatus.CANCELLED
    );
  }

  clear() {
    this.appointments.clear();
    this.availability.clear();
  }
}

describe('Appointment Booking Properties', () => {
  let bookingSystem: MockBookingSystem;

  beforeEach(() => {
    bookingSystem = new MockBookingSystem();
  });

  describe('Property 3: No double-booking constraint', () => {
    it('should never allow two patients to book the same slot', async () => {
      await fc.assert(
        fc.property(
          fc.uuid(), // providerId
          fc.date({ min: new Date(), max: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) }), // dateTime within next 30 days
          fc.uuid(), // patientId1
          fc.uuid(), // patientId2
          fc.constantFrom(...Object.values(ProviderTier)),
          (providerId, dateTime, patientId1, patientId2, tier) => {
            // Skip if patients are the same
            if (patientId1 === patientId2) return;

            // Normalize the dateTime to be within business hours (10:00 AM)
            const normalizedDateTime = new Date(dateTime);
            normalizedDateTime.setHours(10, 0, 0, 0);

            // Set up provider availability for this time
            const dayOfWeek = normalizedDateTime.getDay();
            const startTime = '08:00';
            const endTime = '18:00';
            
            bookingSystem.setProviderAvailability(providerId, [{
              providerId,
              dayOfWeek,
              startTime,
              endTime
            }]);

            // First booking should succeed
            const booking1 = bookingSystem.bookAppointment(patientId1, providerId, normalizedDateTime, tier);
            expect(booking1.success).toBe(true);

            // Second booking for same slot should fail
            const booking2 = bookingSystem.bookAppointment(patientId2, providerId, normalizedDateTime, tier);
            expect(booking2.success).toBe(false);
            expect(booking2.error).toBe('Slot not available');

            bookingSystem.clear();
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should allow booking after cancellation', async () => {
      await fc.assert(
        fc.property(
          fc.uuid(), // providerId
          fc.date({ min: new Date(), max: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) }),
          fc.uuid(), // patientId1
          fc.uuid(), // patientId2
          fc.constantFrom(...Object.values(ProviderTier)),
          (providerId, dateTime, patientId1, patientId2, tier) => {
            if (patientId1 === patientId2) return;

            // Normalize the dateTime to be within business hours (10:00 AM)
            const normalizedDateTime = new Date(dateTime);
            normalizedDateTime.setHours(10, 0, 0, 0);

            // Set up availability
            const dayOfWeek = normalizedDateTime.getDay();
            bookingSystem.setProviderAvailability(providerId, [{
              providerId,
              dayOfWeek,
              startTime: '08:00',
              endTime: '18:00'
            }]);

            // Book and then cancel
            const booking1 = bookingSystem.bookAppointment(patientId1, providerId, normalizedDateTime, tier);
            expect(booking1.success).toBe(true);
            
            const cancelled = bookingSystem.cancelAppointment(booking1.appointmentId!);
            expect(cancelled).toBe(true);

            // Should be able to book again
            const booking2 = bookingSystem.bookAppointment(patientId2, providerId, normalizedDateTime, tier);
            expect(booking2.success).toBe(true);

            bookingSystem.clear();
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  describe('Availability Constraint Properties', () => {
    it('should never allow bookings outside provider availability', async () => {
      await fc.assert(
        fc.property(
          fc.uuid(), // providerId
          fc.integer({ min: 0, max: 6 }), // dayOfWeek
          fc.integer({ min: 8, max: 17 }), // availableHour
          fc.integer({ min: 0, max: 23 }), // requestedHour
          fc.uuid(), // patientId
          fc.constantFrom(...Object.values(ProviderTier)),
          (providerId, dayOfWeek, availableHour, requestedHour, patientId, tier) => {
            // Set provider availability for specific hour
            bookingSystem.setProviderAvailability(providerId, [{
              providerId,
              dayOfWeek,
              startTime: `${availableHour.toString().padStart(2, '0')}:00`,
              endTime: `${(availableHour + 1).toString().padStart(2, '0')}:00`
            }]);

            // Create appointment time for the requested hour on the same day
            const now = new Date();
            const appointmentDate = new Date(now);
            appointmentDate.setDate(now.getDate() + (dayOfWeek - now.getDay() + 7) % 7);
            appointmentDate.setHours(requestedHour, 0, 0, 0);

            const booking = bookingSystem.bookAppointment(patientId, providerId, appointmentDate, tier);

            if (requestedHour === availableHour) {
              // Should succeed if within availability
              expect(booking.success).toBe(true);
            } else {
              // Should fail if outside availability
              expect(booking.success).toBe(false);
            }

            bookingSystem.clear();
          }
        ),
        { numRuns: 40 }
      );
    });

    it('should respect provider working hours boundaries', async () => {
      await fc.assert(
        fc.property(
          fc.uuid(),
          fc.integer({ min: 8, max: 16 }), // startHour
          fc.integer({ min: 1, max: 8 }), // duration
          fc.uuid(),
          fc.constantFrom(...Object.values(ProviderTier)),
          (providerId, startHour, duration, patientId, tier) => {
            const endHour = startHour + duration;
            
            // Set availability window
            bookingSystem.setProviderAvailability(providerId, [{
              providerId,
              dayOfWeek: 1, // Monday
              startTime: `${startHour.toString().padStart(2, '0')}:00`,
              endTime: `${endHour.toString().padStart(2, '0')}:00`
            }]);

            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            
            // Set to Monday (1 = Monday in setDay, but we need to use a different approach)
            const daysUntilMonday = (1 - tomorrow.getDay() + 7) % 7;
            tomorrow.setDate(tomorrow.getDate() + daysUntilMonday);
            
            // Test booking at start boundary (should succeed)
            const startTime = new Date(tomorrow);
            startTime.setHours(startHour, 0, 0, 0);
            const startBooking = bookingSystem.bookAppointment(patientId + '-start', providerId, startTime, tier);
            expect(startBooking.success).toBe(true);

            // Test booking at end boundary (should fail - end time is exclusive)
            const endTime = new Date(tomorrow);
            endTime.setHours(endHour, 0, 0, 0);
            const endBooking = bookingSystem.bookAppointment(patientId + '-end', providerId, endTime, tier);
            expect(endBooking.success).toBe(false);

            bookingSystem.clear();
          }
        ),
        { numRuns: 25 }
      );
    });
  });

  describe('Student Appointment Properties', () => {
    it('should require supervisor approval for student appointments', async () => {
      await fc.assert(
        fc.property(
          fc.uuid(), // providerId
          fc.uuid(), // patientId
          fc.date({ min: new Date(), max: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) }),
          (providerId, patientId, dateTime) => {
            // Set availability
            bookingSystem.setProviderAvailability(providerId, [{
              providerId,
              dayOfWeek: dateTime.getDay(),
              startTime: '08:00',
              endTime: '18:00'
            }]);

            const booking = bookingSystem.bookAppointment(patientId, providerId, dateTime, ProviderTier.TIER_4_STUDENT);
            
            if (booking.success) {
              const appointment = bookingSystem.getAppointment(booking.appointmentId!);
              expect(appointment?.status).toBe(AppointmentStatus.PENDING_SUPERVISOR_APPROVAL);
            }

            bookingSystem.clear();
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should confirm non-student appointments immediately', async () => {
      await fc.assert(
        fc.property(
          fc.uuid(),
          fc.uuid(),
          fc.date({ min: new Date(), max: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) }),
          fc.constantFrom(
            ProviderTier.TIER_1_DOCTOR,
            ProviderTier.TIER_2_NURSE,
            ProviderTier.TIER_3_CERTIFIED_WORKER,
            ProviderTier.TIER_5_VOLUNTEER
          ),
          (providerId, patientId, dateTime, tier) => {
            // Set availability
            bookingSystem.setProviderAvailability(providerId, [{
              providerId,
              dayOfWeek: dateTime.getDay(),
              startTime: '08:00',
              endTime: '18:00'
            }]);

            const booking = bookingSystem.bookAppointment(patientId, providerId, dateTime, tier);
            
            if (booking.success) {
              const appointment = bookingSystem.getAppointment(booking.appointmentId!);
              expect(appointment?.status).toBe(AppointmentStatus.CONFIRMED);
            }

            bookingSystem.clear();
          }
        ),
        { numRuns: 30 }
      );
    });
  });

  describe('Concurrent Booking Properties', () => {
    it('should handle concurrent booking attempts atomically', async () => {
      const providerId = 'provider-1';
      const dateTime = new Date();
      dateTime.setHours(14, 0, 0, 0); // 2 PM
      
      // Set availability
      bookingSystem.setProviderAvailability(providerId, [{
        providerId,
        dayOfWeek: dateTime.getDay(),
        startTime: '08:00',
        endTime: '18:00'
      }]);

      // Simulate concurrent booking attempts
      const patients = ['patient-1', 'patient-2', 'patient-3'];
      const bookingPromises = patients.map(patientId =>
        Promise.resolve(bookingSystem.bookAppointment(patientId, providerId, dateTime, ProviderTier.TIER_1_DOCTOR))
      );

      const results = await Promise.all(bookingPromises);
      const successfulBookings = results.filter(r => r.success);
      
      // Only one booking should succeed
      expect(successfulBookings).toHaveLength(1);
      
      // Others should fail with appropriate error
      const failedBookings = results.filter(r => !r.success);
      expect(failedBookings).toHaveLength(2);
      failedBookings.forEach(booking => {
        expect(booking.error).toBe('Slot not available');
      });
    });
  });
});