import { createReceipt } from './shared/repositories/receipt-repository';
import { resolveDb, resolveLandlordOpenId, type CloudEventBase } from './shared/runtime';

export interface ReceiptCreateEvent extends CloudEventBase {
  billIds?: string[];
  month?: string;
  leaseId?: string;
  roomId?: string;
  note?: string;
}

export async function main(event: ReceiptCreateEvent) {
  const db = resolveDb(event);
  const landlordOpenId = resolveLandlordOpenId(event);

  return createReceipt(
    db,
    landlordOpenId,
    {
      billIds: event.billIds,
      month: event.month,
      leaseId: event.leaseId,
      roomId: event.roomId,
      note: event.note
    },
    event
  );
}
