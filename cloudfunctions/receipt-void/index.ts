import { voidReceipt } from './shared/repositories/receipt-repository';
import { resolveDb, resolveLandlordOpenId, type CloudEventBase } from './shared/runtime';

export interface ReceiptVoidEvent extends CloudEventBase {
  receiptId: string;
  voidReason?: string;
}

export async function main(event: ReceiptVoidEvent) {
  const db = resolveDb(event);
  const landlordOpenId = resolveLandlordOpenId(event);

  return voidReceipt(
    db,
    landlordOpenId,
    {
      receiptId: event.receiptId,
      voidReason: event.voidReason
    },
    event
  );
}
