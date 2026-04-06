import { endLease } from './shared/repositories/lease-repository';
import { resolveDb, type CloudEventBase } from './shared/runtime';

export interface LeaseEndEvent extends CloudEventBase {
  leaseId: string;
}

export async function main(event: LeaseEndEvent) {
  return endLease(resolveDb(event), event.leaseId, event);
}
