import { buildRentableUnitSummary } from './shared/calculators/rentable-unit';
import { deriveLeaseStatus } from './shared/calculators/lease-lifecycle';
import { LEASE_STATUSES } from './shared/constants/statuses';
import { getAllDomainData, resolveLandlordOpenId, type CloudEventBase, resolveDb } from './shared/runtime';

export async function main(event: CloudEventBase) {
  const db = resolveDb(event);
  const landlordOpenId = resolveLandlordOpenId(event);
  const now = event.now ?? new Date().toISOString();
  const { assets, rooms, tenants, leases, bills } = await getAllDomainData(db, landlordOpenId);
  const activeLeaseIdSet = new Set(
    leases
      .filter((lease) => deriveLeaseStatus(lease, now) === LEASE_STATUSES.active)
      .map((lease) => lease.id)
  );
  const activeBills = bills.filter((bill) => activeLeaseIdSet.has(bill.leaseId));

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
      bills: activeBills,
      now
    });
  });
}
