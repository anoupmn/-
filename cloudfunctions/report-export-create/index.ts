import {
  buildMonthlyReportData,
  REPORT_SHEET_NAMES,
  resolveReportScopeLabel,
  saveReportExportMetadata,
  summarizeReportWorkbook
} from './shared/repositories/report-export-repository';
import { reportExportRequestSchema } from './shared/schemas/report-export';
import { createId, resolveDb, resolveLandlordOpenId, resolveNow, type CloudEventBase } from './shared/runtime';

const cloudSdk = (() => {
  try {
    return require('wx-server-sdk');
  } catch {
    return null;
  }
})();

export interface ReportExportCreateEvent extends CloudEventBase {
  month: string;
  assetId?: string;
  roomId?: string;
}

function buildWorkbookBuffer(workbookData: Record<string, unknown[]>) {
  let XLSX: any;
  try {
    XLSX = require('xlsx');
  } catch {
    return Buffer.from(JSON.stringify(workbookData), 'utf8');
  }

  const workbook = XLSX.utils.book_new();

  REPORT_SHEET_NAMES.forEach((sheetName) => {
    const rows = workbookData[sheetName] ?? [];
    const sheet = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(workbook, sheet, sheetName);
  });

  return XLSX.write(workbook, {
    bookType: 'xlsx',
    type: 'buffer'
  }) as Buffer;
}

async function uploadWorkbook(fileName: string, buffer: Buffer, shouldSkipUpload: boolean) {
  if (shouldSkipUpload || !cloudSdk?.uploadFile) {
    return undefined;
  }

  const result = await cloudSdk.uploadFile({
    cloudPath: `report_exports/${fileName}`,
    fileContent: buffer
  });

  return result.fileID as string | undefined;
}

function safeFileSegment(value: string) {
  return (
    value
      .trim()
      .replace(/[\\/:*?"<>|\s]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 40) || '全部房源'
  );
}

function compactTimestamp(value: string) {
  return value.replace(/\D/g, '').slice(0, 14) || String(Date.now());
}

export function buildReportFileName(month: string, scopeLabel: string, generatedAt: string, exportId: string) {
  const shortId = exportId.replace(/^report_export_/, '').slice(0, 8);
  return `收租吧-${month}-${safeFileSegment(scopeLabel)}-月度经营明细-${compactTimestamp(generatedAt)}-${shortId}.xlsx`;
}

export async function main(event: ReportExportCreateEvent) {
  const db = resolveDb(event);
  const landlordOpenId = resolveLandlordOpenId(event);
  const generatedAt = resolveNow(event);
  const exportId = createId('report_export');
  const request = reportExportRequestSchema.parse({
    month: event.month,
    assetId: event.assetId,
    roomId: event.roomId
  });
  const workbook = await buildMonthlyReportData(db, landlordOpenId, request);
  const summary = summarizeReportWorkbook(workbook);
  const scopeLabel = await resolveReportScopeLabel(db, landlordOpenId, request);
  const fileName = buildReportFileName(request.month, scopeLabel, generatedAt, exportId);
  const buffer = buildWorkbookBuffer(workbook);
  const fileID = await uploadWorkbook(fileName, buffer, Boolean(event.__mockDb));

  await saveReportExportMetadata(
    db,
    landlordOpenId,
    request,
    fileName,
    scopeLabel,
    [...REPORT_SHEET_NAMES],
    summary,
    event,
    fileID,
    exportId
  );

  return {
    fileID,
    fileName,
    scopeLabel,
    sheetNames: [...REPORT_SHEET_NAMES],
    summary,
    workbook,
    generatedAt
  };
}
