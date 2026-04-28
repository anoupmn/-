import { createReceipt } from './shared/repositories/receipt-repository';
import { resolveDb, resolveLandlordOpenId, type CloudEventBase } from './shared/runtime';

export interface ReceiptCreateEvent extends CloudEventBase {
  billIds?: string[];
  month?: string;
  roomId?: string;
  collectorName?: string;
  note?: string;
  reissueFromReceiptId?: string;
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
      roomId: event.roomId,
      collectorName: event.collectorName,
      note: event.note,
      reissueFromReceiptId: event.reissueFromReceiptId
    },
    event
  );
}
