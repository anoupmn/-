import { deleteReceipt } from './shared/repositories/receipt-repository';
import { resolveDb, resolveLandlordOpenId, type CloudEventBase } from './shared/runtime';

export interface ReceiptDeleteEvent extends CloudEventBase {
  receiptId: string;
}

export async function main(event: ReceiptDeleteEvent) {
  const db = resolveDb(event);
  const landlordOpenId = resolveLandlordOpenId(event);

  return deleteReceipt(db, landlordOpenId, String(event.receiptId || ''), event);
}
