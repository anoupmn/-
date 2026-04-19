import { buildDashboardPayload } from './shared/calculators/dashboard';
import { buildRentableUnitSummary } from './shared/calculators/rentable-unit';
import { deriveLeaseStatus } from './shared/calculators/lease-lifecycle';
import { LEASE_STATUSES } from './shared/constants/statuses';
import { rebuildAlerts } from './shared/repositories/alert-repository';
import { listAbnormalFlags, syncRepairFrequencyAbnormalFlags } from './shared/repositories/abnormal-flag-repository';
import { getNotificationPreference } from './shared/repositories/notification-preference-repository';
import { getAllDomainData, resolveDb, resolveLandlordOpenId, type CloudEventBase } from './shared/runtime';

export async function main(event: CloudEventBase) {
  const db = resolveDb(event);
  const landlordOpenId = resolveLandlordOpenId(event);
  const now = event.now ?? new Date().toISOString();
  const { assets, rooms, tenants, leases, bills, repairs } = await getAllDomainData(db, landlordOpenId);
  const activeLeases = leases.filter((lease) => deriveLeaseStatus(lease, now) === LEASE_STATUSES.active);
  const activeLeaseIdSet = new Set(activeLeases.map((lease) => lease.id));
  const activeBills = bills.filter((bill) => activeLeaseIdSet.has(bill.leaseId));

  await syncRepairFrequencyAbnormalFlags(
    db,
    {
      rooms,
      leases,
      repairs,
      now
    },
    { ...event, now }
  );
  const abnormalFlags = await listAbnormalFlags(db, landlordOpenId);

  const alerts = await rebuildAlerts(db, {
    assets,
    rooms,
    leases,
    tenants,
    bills: activeBills,
    abnormalFlags,
    now
  });

  const units = rooms
    .map((room) => {
      const asset = assets.find((item) => item.id === room.assetId);
      if (!asset) {
        return null;
      }

      return buildRentableUnitSummary({
        asset,
        room,
        leases,
        tenants,
        bills: activeBills,
        now
      });
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  const preference = await getNotificationPreference(db, landlordOpenId);
  return buildDashboardPayload({
    alerts: alerts.filter((item) => item.landlordOpenId === landlordOpenId),
    units,
    subscriptionState: {
      consentState: preference.consentState,
      hasRequested: preference.hasRequested,
      enabledRuleTypes: preference.enabledRuleTypes
    }
  });
}
