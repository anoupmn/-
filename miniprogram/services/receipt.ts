import { callCloudFunction } from './cloud';

export function createReceipt(payload: Record<string, unknown>) {
  return callCloudFunction('receipt-create', payload);
}

export function getReceipt(payload: Record<string, unknown>) {
  return callCloudFunction('receipt-get', payload);
}

export function listReceiptRecords(payload: Record<string, unknown>) {
  return callCloudFunction('receipt-list', payload);
}

export function listReceiptLeaseOptions(payload: Record<string, unknown> = {}) {
  return callCloudFunction('receipt-lease-options', payload);
}

export function exportReceiptPdf(payload: Record<string, unknown>) {
  return callCloudFunction('receipt-pdf', payload);
}

export function voidReceipt(payload: Record<string, unknown>) {
  return callCloudFunction('receipt-void', payload);
}
