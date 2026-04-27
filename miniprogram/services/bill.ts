import { callCloudFunction } from './cloud';

export function receiveBill(payload: {
  billId: string;
  receivedAt: string;
  receivedAmount: number;
}) {
  return callCloudFunction('bills-receive', payload);
}

export function saveBill(payload: {
  leaseId: string;
  monthKey: string;
  type: 'water' | 'electricity' | 'misc' | 'custom';
  amount?: number;
  itemLabel?: string;
  previousReading?: number;
  currentReading?: number;
  unitPrice?: number;
  note?: string;
}) {
  return callCloudFunction('bills-save', payload);
}

export function deleteBill(payload: {
  billId: string;
}) {
  return callCloudFunction('bills-save', {
    mode: 'delete',
    ...payload
  });
}
