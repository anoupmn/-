import { markBillReceived } from './shared/repositories/bill-repository';
import { COLLECTIONS } from './shared/constants/collections';
import { listAll, resolveDb, resolveLandlordOpenId, type CloudEventBase } from './shared/runtime';

export interface BillsReceiveEvent extends CloudEventBase {
  billId: string;
  receivedAt: string;
  receivedAmount: number;
}

export async function main(event: BillsReceiveEvent) {
  const db = resolveDb(event);
  const landlordOpenId = resolveLandlordOpenId(event);
  const bills = await listAll<{ id: string; landlordOpenId: string }>(db, COLLECTIONS.bills);
  const ownedBill = bills.find((item) => item.id === event.billId && item.landlordOpenId === landlordOpenId);

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
