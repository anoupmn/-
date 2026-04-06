import { markBillReceived } from './shared/repositories/bill-repository';
import { resolveDb, type CloudEventBase } from './shared/runtime';

export interface BillsReceiveEvent extends CloudEventBase {
  billId: string;
  receivedAt: string;
  receivedAmount: number;
}

export async function main(event: BillsReceiveEvent) {
  const db = resolveDb(event);

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
