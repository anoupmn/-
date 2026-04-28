import { listReceiptRecords } from './shared/repositories/receipt-repository';
import { resolveDb, resolveLandlordOpenId, type CloudEventBase } from './shared/runtime';

export interface ReceiptListEvent extends CloudEventBase {
  filters?: {
    month?: string;
    assetId?: string;
    leaseId?: string;
    roomId?: string;
    tenantId?: string;
    status?: 'all' | 'active' | 'voided';
  };
}

export async function main(event: ReceiptListEvent = {}) {
  const db = resolveDb(event);
  const landlordOpenId = resolveLandlordOpenId(event);

  return {
    receipts: await listReceiptRecords(db, landlordOpenId, event.filters ?? {})
  };
}
