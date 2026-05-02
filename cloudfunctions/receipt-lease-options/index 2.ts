import { listReceiptLeaseOptions } from './shared/repositories/receipt-repository';
import { resolveDb, resolveLandlordOpenId, type CloudEventBase } from './shared/runtime';

export async function main(event: CloudEventBase = {}) {
  const db = resolveDb(event);
  const landlordOpenId = resolveLandlordOpenId(event);

  return {
    leases: await listReceiptLeaseOptions(db, landlordOpenId)
  };
}
