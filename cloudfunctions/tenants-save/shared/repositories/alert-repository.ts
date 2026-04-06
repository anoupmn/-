import { evaluateAlerts } from '../calculators/alert-evaluator';
import { COLLECTIONS } from '../constants/collections';
import type { Alert } from '../schemas/alert';
import type { AbnormalFlag } from '../schemas/abnormal-flag';
import type { Asset } from '../schemas/asset';
import type { Bill } from '../schemas/bill';
import type { Lease } from '../schemas/lease';
import type { Room } from '../schemas/room';
import type { Tenant } from '../schemas/tenant';
import { insertRecord, listAll, type DbLike } from '../runtime';

export async function listAlerts(db: DbLike, landlordOpenId?: string) {
  const alerts = await listAll<Alert>(db, COLLECTIONS.alerts);
  return landlordOpenId ? alerts.filter((item) => item.landlordOpenId === landlordOpenId) : alerts;
}

export async function rebuildAlerts(
  db: DbLike,
  input: {
    assets: Asset[];
    rooms: Room[];
    leases: Lease[];
    tenants: Tenant[];
    bills: Bill[];
    abnormalFlags: AbnormalFlag[];
    now: string;
  }
) {
  const alerts = evaluateAlerts(input);
  await db.collection(COLLECTIONS.alerts).where({}).remove();

  for (const alert of alerts) {
    await insertRecord(db, COLLECTIONS.alerts, alert);
  }

  return alerts;
}
