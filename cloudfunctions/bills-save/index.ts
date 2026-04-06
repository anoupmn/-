import { createManualBill } from './shared/repositories/bill-repository';
import { resolveDb, type CloudEventBase, listAll } from './shared/runtime';
import { COLLECTIONS } from './shared/constants/collections';
import type { Lease } from './shared/schemas/lease';
import type { BillSection, BillType } from './shared/schemas/bill';

export interface BillsSaveEvent extends CloudEventBase {
  leaseId: string;
  monthKey: string;
  type: BillType;
  amount: number;
  itemLabel?: string;
}

export async function main(event: BillsSaveEvent) {
  const db = resolveDb(event);
  const leases = await listAll<Lease>(db, COLLECTIONS.leases);
  const lease = leases.find((item) => item.id === event.leaseId);

  if (!lease) {
    throw new Error(`Lease ${event.leaseId} not found.`);
  }

  const section: BillSection = event.type === 'rent' ? 'rent' : event.type === 'deposit' ? 'deposit' : 'non_rent';
  const dueDate = `${event.monthKey}-01`;

  return createManualBill(
    db,
    {
      lease,
      type: event.type,
      section,
      dueDate,
      amount: Number(event.amount || 0),
      itemLabel: event.itemLabel
    },
    event
  );
}
