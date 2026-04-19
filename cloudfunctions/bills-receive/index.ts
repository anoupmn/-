import { markBillReceived } from './shared/repositories/bill-repository';
import { COLLECTIONS } from './shared/constants/collections';
import { resolveDb, resolveLandlordOpenId, type CloudEventBase } from './shared/runtime';

export interface BillsReceiveEvent extends CloudEventBase {
  billId: string;
  receivedAt: string;
  receivedAmount: number;
}

export async function main(event: BillsReceiveEvent) {
  const db = resolveDb(event);
  const landlordOpenId = resolveLandlordOpenId(event);
  const ownedBillsResult = await db.collection(COLLECTIONS.bills).where({
    id: event.billId,
    landlordOpenId
  }).get();
  const ownedBill = ownedBillsResult.data?.[0];

  if (!ownedBill) {
    throw new Error(`Bill ${event.billId} not found.`);
  }

  return markBillReceived(
    db,
    {
      billId: event.billId,
      receivedAt: event.receivedAt,
      receivedAmount: event.receivedAmount
    },
    event
  );
}
