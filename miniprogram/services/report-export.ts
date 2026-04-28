import { callCloudFunction } from './cloud';

export function createMonthlyReportExport(payload: Record<string, unknown>) {
  return callCloudFunction('report-export-create', payload);
}
