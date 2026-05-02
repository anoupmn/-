import { deleteReportExport } from './shared/repositories/report-export-repository';
import { resolveDb, resolveLandlordOpenId, type CloudEventBase } from './shared/runtime';

const cloudSdk = (() => {
  try {
    return require('wx-server-sdk');
  } catch {
    return null;
  }
})();

export interface ReportExportDeleteEvent extends CloudEventBase {
  exportId: string;
}

export async function main(event: ReportExportDeleteEvent) {
  const db = resolveDb(event);
  const landlordOpenId = resolveLandlordOpenId(event);
  const record = await deleteReportExport(db, landlordOpenId, event.exportId);

  if (record.fileID && !event.__mockDb && cloudSdk?.deleteFile) {
    await cloudSdk.deleteFile({
      fileList: [record.fileID]
    });
  }

  return {
    deleted: true,
    exportId: record.id
  };
}
