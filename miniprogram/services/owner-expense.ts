import { callCloudFunction } from './cloud';

export function saveOwnerExpense(payload: {
  assetId?: string;
  roomId?: string;
  expenseType: 'repair' | 'cleaning' | 'caretaking' | 'labor' | 'other';
  amount?: number | null;
  note?: string;
  occurredAt?: string;
  repairCategory?: 'plumbing' | 'electrical' | 'appliance' | 'structure' | 'safety' | 'other';
}) {
  return callCloudFunction('owner-expense-save', payload);
}
