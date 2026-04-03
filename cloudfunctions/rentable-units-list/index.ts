import { buildRentableUnitSummary } from '../shared/calculators/rentable-unit';
import { deriveLeaseStatus } from '../shared/calculators/lease-lifecycle';
import { LEASE_STATUSES } from '../shared/constants/statuses';
import { ensureBillsForLease } from '../shared/repositories/bill-repository';
import { getAllDomainData, type CloudEventBase, resolveDb } from '../shared/runtime';

export async function main(event: CloudEventBase) {
  const db = resolveDb(event);
  const now = event.now ?? new Date().toISOString();
  const { assets, rooms, tenants, leases, bills } = await getAllDomainData(db);
  const ensuredBills = [...bills];

  for (const lease of leases) {
    if (deriveLeaseStatus(lease, now) !== LEASE_STATUSES.active) {
      continue;
    }

    const hasBills = ensuredBills.some((bill) => bill.leaseId === lease.id);
    if (hasBills) {
      continue;
    }

    const backfilledBills = await ensureBillsForLease(db, lease, { ...event, now });
    ensuredBills.push(...backfilledBills);
  }

  return rooms.map((room) => {
    const asset = assets.find((item) => item.id === room.assetId);
    if (!asset) {
      throw new Error(`Asset ${room.assetId} not found for room ${room.id}.`);
    }

    return buildRentableUnitSummary({
      asset,
      room,
      leases,
      tenants,
      bills: ensuredBills,
      now
    });
  });
}
