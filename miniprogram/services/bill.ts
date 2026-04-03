import { callCloudFunction } from './cloud';

export function receiveBill(payload: {
  billId: string;
  receivedAt: string;
  receivedAmount: number;
}) {
  return callCloudFunction('bills-receive', payload);
}
