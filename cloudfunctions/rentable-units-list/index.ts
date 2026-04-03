import { buildRentableUnitSummary } from '../shared/calculators/rentable-unit';
import { getAllDomainData, type CloudEventBase, resolveDb } from '../shared/runtime';

export async function main(event: CloudEventBase) {
  const db = resolveDb(event);
  const { assets, rooms, tenants, leases, bills } = await getAllDomainData(db);

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
      bills,
      now: event.now ?? new Date().toISOString()
    });
  });
}
