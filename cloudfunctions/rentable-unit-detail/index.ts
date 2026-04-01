import { LEASE_STATUSES } from '../shared/constants/statuses';
import { deriveLeaseStatus } from '../shared/calculators/lease-lifecycle';
import { getAllDomainData, type CloudEventBase, resolveDb } from '../shared/runtime';

export interface RentableUnitDetailEvent extends CloudEventBase {
  roomId: string;
}

export async function main(event: RentableUnitDetailEvent) {
  const db = resolveDb(event);
  const { assets, rooms, tenants, leases } = await getAllDomainData(db);
  const room = rooms.find((item) => item.id === event.roomId);

  if (!room) {
    throw new Error(`Room ${event.roomId} not found.`);
  }

  const asset = assets.find((item) => item.id === room.assetId);
  if (!asset) {
    throw new Error(`Asset ${room.assetId} not found.`);
  }

  const leaseHistory = leases
    .filter((lease) => lease.roomId === room.id)
    .sort((a, b) => a.startDate.localeCompare(b.startDate));
  const activeLease =
    leaseHistory.find((lease) => deriveLeaseStatus(lease, event.now ?? new Date().toISOString()) === LEASE_STATUSES.active) ??
    null;
  const tenantHistory = leaseHistory
    .map((lease) => tenants.find((tenant) => tenant.id === lease.tenantId))
    .filter((tenant): tenant is NonNullable<typeof tenant> => Boolean(tenant));

  return {
    asset,
    room,
    activeLease,
    leaseHistory,
    tenantHistory
  };
}
