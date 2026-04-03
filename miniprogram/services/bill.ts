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
  amount: number;
  itemLabel?: string;
}) {
  return callCloudFunction('bills-save', payload);
}
