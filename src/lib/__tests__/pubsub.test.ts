import { resetRedisClient } from '../redis';
import {
  publish,
  subscribeToQueueUpdates,
  subscribeToAppointmentStatus,
  subscribeToDiagnosisReady,
  unsubscribe,
  Channels,
  type QueueUpdatePayload,
  type AppointmentStatusPayload,
  type DiagnosisReadyPayload,
} from '../pubsub';

beforeEach(() => {
  resetRedisClient();
});

describe('pub/sub – queue updates', () => {
  it('delivers a QUEUE_UPDATE event to subscribers', async () => {
    const received: QueueUpdatePayload[] = [];
    await subscribeToQueueUpdates('prov-1', (p) => received.push(p));

    const payload: QueueUpdatePayload = {
      type: 'QUEUE_UPDATE',
      providerId: 'prov-1',
      queueItemId: 'qi-1',
      patientId: 'pat-1',
      position: 2,
      estimatedWaitMinutes: 10,
      status: 'WAITING',
      isUrgent: false,
    };

    await publish(payload);
    expect(received).toHaveLength(1);
    expect(received[0]).toEqual(payload);
  });

  it('does not deliver events for a different provider', async () => {
    const received: QueueUpdatePayload[] = [];
    await subscribeToQueueUpdates('prov-1', (p) => received.push(p));

    await publish({
      type: 'QUEUE_UPDATE',
      providerId: 'prov-2',
      queueItemId: 'qi-2',
      patientId: 'pat-2',
      position: 1,
      status: 'WAITING',
      isUrgent: false,
    });

    expect(received).toHaveLength(0);
  });
});

describe('pub/sub – appointment status', () => {
  it('delivers an APPOINTMENT_STATUS event to subscribers', async () => {
    const received: AppointmentStatusPayload[] = [];
    await subscribeToAppointmentStatus('pat-1', (p) => received.push(p));

    const payload: AppointmentStatusPayload = {
      type: 'APPOINTMENT_STATUS',
      appointmentId: 'appt-1',
      patientId: 'pat-1',
      providerId: 'prov-1',
      status: 'CONFIRMED',
    };

    await publish(payload);
    expect(received).toHaveLength(1);
    expect(received[0]).toEqual(payload);
  });
});

describe('pub/sub – diagnosis ready', () => {
  it('delivers a DIAGNOSIS_READY event to subscribers', async () => {
    const received: DiagnosisReadyPayload[] = [];
    await subscribeToDiagnosisReady('pat-1', (p) => received.push(p));

    const payload: DiagnosisReadyPayload = {
      type: 'DIAGNOSIS_READY',
      diagnosisId: 'diag-1',
      appointmentId: 'appt-1',
      patientId: 'pat-1',
      providerId: 'prov-1',
    };

    await publish(payload);
    expect(received).toHaveLength(1);
    expect(received[0]).toEqual(payload);
  });
});

describe('pub/sub – channel naming', () => {
  it('generates correct channel names', () => {
    expect(Channels.queueUpdates('p1')).toBe('queue_updates:p1');
    expect(Channels.appointmentStatus('pat1')).toBe('appointment_status:pat1');
    expect(Channels.diagnosisReady('pat1')).toBe('diagnosis_ready:pat1');
  });
});

describe('pub/sub – unsubscribe', () => {
  it('stops delivering events after unsubscribe', async () => {
    const received: QueueUpdatePayload[] = [];
    await subscribeToQueueUpdates('prov-1', (p) => received.push(p));
    await unsubscribe(Channels.queueUpdates('prov-1'));

    await publish({
      type: 'QUEUE_UPDATE',
      providerId: 'prov-1',
      queueItemId: 'qi-1',
      patientId: 'pat-1',
      position: 1,
      status: 'WAITING',
      isUrgent: false,
    });

    expect(received).toHaveLength(0);
  });
});
