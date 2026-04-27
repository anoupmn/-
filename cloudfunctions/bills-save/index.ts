import { createManualBill, createMeterBill } from './shared/repositories/bill-repository';
import { resolveDb, resolveLandlordOpenId, type CloudEventBase, listAll } from './shared/runtime';
import { COLLECTIONS } from './shared/constants/collections';
import type { Lease } from './shared/schemas/lease';
import type { BillSection, BillType } from './shared/schemas/bill';

export interface BillsSaveEvent extends CloudEventBase {
  mode?: 'create' | 'delete';
  billId?: string;
  leaseId?: string;
  monthKey?: string;
  type?: BillType;
  amount?: number;
  itemLabel?: string;
  previousReading?: number;
  currentReading?: number;
  unitPrice?: number;
  note?: string;
}

export async function main(event: BillsSaveEvent) {
  const db = resolveDb(event);
  const landlordOpenId = resolveLandlordOpenId(event);
  const mode = event.mode ?? (event.billId ? 'delete' : 'create');

  if (mode === 'delete') {
    const billId = String(event.billId || '').trim();
    if (!billId) {
      throw new Error('billId is required when deleting manual bill.');
    }

    const bills = await listAll<{ id: string; landlordOpenId: string; source?: 'system' | 'manual' }>(db, COLLECTIONS.bills);
    const targetBill = bills.find((item) => item.id === billId && item.landlordOpenId === landlordOpenId);
    if (!targetBill) {
      throw new Error(`Bill ${billId} not found.`);
    }

    if (targetBill.source !== 'manual') {
      throw new Error('Only manual bills can be deleted.');
    }

    await db.collection(COLLECTIONS.bills).where({ id: billId, landlordOpenId }).remove();
    return {
      deletedBillId: billId
    };
  }

  const leaseId = String(event.leaseId || '').trim();
  const monthKey = String(event.monthKey || '').trim();
  const type = event.type;
  if (!leaseId || !monthKey || !type) {
    throw new Error('leaseId, monthKey and type are required.');
  }

  const leases = await listAll<Lease>(db, COLLECTIONS.leases);
  const lease = leases.find((item) => item.id === leaseId && item.landlordOpenId === landlordOpenId);

  if (!lease) {
    throw new Error(`Lease ${leaseId} not found.`);
  }

  const section: BillSection = event.type === 'rent' ? 'rent' : event.type === 'deposit' ? 'deposit' : 'non_rent';
  const dueDate = `${monthKey}-01`;

  if (type === 'water' || type === 'electricity') {
    return createMeterBill(
      db,
      {
        lease,
        type,
        dueDate,
        previousReading: Number(event.previousReading),
        currentReading: Number(event.currentReading),
        unitPrice: Number(event.unitPrice),
        note: event.note
      },
      event
    );
  }

  return createManualBill(
    db,
    {
      lease,
      type,
      section,
      dueDate,
      amount: Number(event.amount || 0),
      itemLabel: event.itemLabel,
      note: event.note
    },
    event
  );
}
