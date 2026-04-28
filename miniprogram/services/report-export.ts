import { callCloudFunction } from './cloud';

export function createMonthlyReportExport(payload: Record<string, unknown>) {
  return callCloudFunction('report-export-create', payload);
}

export function listReportExports() {
  return callCloudFunction('report-export-list');
}

export function deleteReportExport(payload: Record<string, unknown>) {
  return callCloudFunction('report-export-delete', payload);
}
