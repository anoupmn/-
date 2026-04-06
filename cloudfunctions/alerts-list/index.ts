import { ALERT_TYPE_LABELS } from './shared/constants/statuses';
import { rebuildAlerts } from './shared/repositories/alert-repository';
import { listAbnormalFlags } from './shared/repositories/abnormal-flag-repository';
import { ensureBillsForLease } from './shared/repositories/bill-repository';
import { deriveLeaseStatus } from './shared/calculators/lease-lifecycle';
import { LEASE_STATUSES } from './shared/constants/statuses';
import { getAllDomainData, resolveDb, type CloudEventBase } from './shared/runtime';

export async function main(event: CloudEventBase) {
  const db = resolveDb(event);
  const now = event.now ?? new Date().toISOString();
  const { assets, rooms, tenants, leases, bills } = await getAllDomainData(db);
  const abnormalFlags = await listAbnormalFlags(db);
  const ensuredBills = [...bills];

  for (const lease of leases) {
    if (deriveLeaseStatus(lease, now) !== LEASE_STATUSES.active) {
      continue;
    }

    if (ensuredBills.some((bill) => bill.leaseId === lease.id)) {
      continue;
    }

    ensuredBills.push(...(await ensureBillsForLease(db, lease, { ...event, now })));
  }

  const alerts = await rebuildAlerts(db, {
    assets,
    rooms,
    leases,
    tenants,
    bills: ensuredBills,
    abnormalFlags,
    now
  });

  const groupsMap = new Map<string, { type: string; label: string; items: typeof alerts }>();
  alerts.forEach((alert) => {
    if (!groupsMap.has(alert.type)) {
      groupsMap.set(alert.type, {
        type: alert.type,
        label: ALERT_TYPE_LABELS[alert.type],
        items: []
      });
    }

    groupsMap.get(alert.type)?.items.push(alert);
  });

  return {
    groups: Array.from(groupsMap.values())
  };
}
