import { getReceipt } from './shared/repositories/receipt-repository';
import { resolveDb, resolveLandlordOpenId, type CloudEventBase } from './shared/runtime';

export interface ReceiptGetEvent extends CloudEventBase {
  receiptId: string;
}

export async function main(event: ReceiptGetEvent) {
  const db = resolveDb(event);
  const landlordOpenId = resolveLandlordOpenId(event);

  return getReceipt(db, landlordOpenId, event.receiptId);
}
