import { COLLECTIONS } from './shared/constants/collections';
import { getReceipt } from './shared/repositories/receipt-repository';
import type { Lease } from './shared/schemas/lease';
import { listAll, resolveDb, resolveLandlordOpenId, resolveNow, type CloudEventBase } from './shared/runtime';

const cloudSdk = (() => {
  try {
    return require('wx-server-sdk');
  } catch {
    return null;
  }
})();

export interface ReceiptPdfEvent extends CloudEventBase {
  receiptId: string;
}

function utf16Hex(value: string) {
  return Buffer.from(String(value), 'utf16le')
    .swap16()
    .toString('hex')
    .toUpperCase();
}

function pdfText(value: string, x: number, y: number, size = 11, font = 'F1') {
  if (font === 'F2') {
    return `BT /${font} ${size} Tf ${x} ${y} Td (${escapePdfText(value)}) Tj ET`;
  }

  return `BT /${font} ${size} Tf ${x} ${y} Td <${utf16Hex(value)}> Tj ET`;
}

function pdfLine(x1: number, y1: number, x2: number, y2: number) {
  return `0.7 w ${x1} ${y1} m ${x2} ${y2} l S`;
}

function escapePdfText(value: string) {
  return String(value || '').replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function money(value: unknown) {
  return Number(value || 0).toFixed(2);
}

function dateOnly(value: unknown) {
  return String(value || '').slice(0, 10);
}

function shortText(value: unknown, maxLength = 16) {
  const text = String(value || '').trim();
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
}

function buildPdf(receipt: Record<string, any>, generatedAt: string) {
  const items = ((receipt.items || []) as Array<Record<string, any>>).slice(0, 14);
  const rows = items.flatMap((item, index) => {
    const y = 590 - index * 28;
    return [
      pdfText(String(index + 1), 76, y, 10, 'F2'),
      pdfText(shortText(item.itemLabel, 14), 108, y, 10),
      pdfText(dateOnly(item.dueDate), 245, y, 10, 'F2'),
      pdfText(dateOnly(item.receivedAt), 335, y, 10, 'F2'),
      pdfText(money(item.receivedAmount), 455, y, 10, 'F2')
    ];
  });
  const totalY = Math.max(150, 590 - items.length * 28 - 24);
  const lines = [
    pdfText('收款收据（非发票）', 222, 790, 18),
    pdfLine(72, 770, 523, 770),
    pdfText('收据编号', 72, 742, 10),
    pdfText(String(receipt.receiptNo || ''), 135, 742, 10, 'F2'),
    pdfText('房源/房间', 72, 718, 10),
    pdfText(`${receipt.assetName || ''} / ${receipt.roomName || ''}`, 135, 718, 10),
    pdfText('租客', 72, 694, 10),
    pdfText(String(receipt.tenantName || ''), 135, 694, 10),
    pdfText('收款日期', 330, 694, 10),
    pdfText(dateOnly(receipt.receivedAt), 398, 694, 10, 'F2'),
    pdfText('收款项目明细', 72, 652, 13),
    pdfLine(72, 632, 523, 632),
    pdfText('序号', 76, 612, 10),
    pdfText('项目', 108, 612, 10),
    pdfText('应收日期', 245, 612, 10),
    pdfText('实收日期', 335, 612, 10),
    pdfText('金额', 455, 612, 10),
    pdfLine(72, 602, 523, 602),
    ...rows,
    pdfLine(72, totalY + 16, 523, totalY + 16),
    pdfText('合计金额', 72, totalY, 13),
    pdfText('¥', 430, totalY, 13),
    pdfText(money(receipt.totalAmount), 455, totalY, 13, 'F2'),
    pdfText('生成时间', 72, totalY - 30, 10),
    pdfText(dateOnly(receipt.createdAt), 135, totalY - 30, 10, 'F2'),
    pdfText('本收据仅作为租金及相关费用收款凭证，不作为发票使用。', 72, 76, 9),
    pdfText('PDF生成时间', 72, 52, 8),
    pdfText(dateOnly(generatedAt), 145, 52, 8, 'F2')
  ];
  const content = lines.join('\n');
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 8 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type0 /BaseFont /STSong-Light /Encoding /UniGB-UCS2-H /DescendantFonts [6 0 R] >>',
    `<< /Length ${Buffer.byteLength(content, 'binary')} >>\nstream\n${content}\nendstream`,
    '<< /Type /Font /Subtype /CIDFontType0 /BaseFont /STSong-Light /CIDSystemInfo << /Registry (Adobe) /Ordering (GB1) /Supplement 2 >> /FontDescriptor 7 0 R >>',
    '<< /Type /FontDescriptor /FontName /STSong-Light /Flags 6 /FontBBox [0 -200 1000 900] /ItalicAngle 0 /Ascent 800 /Descent -200 /CapHeight 700 /StemV 80 >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'
  ];
  let body = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(body, 'binary'));
    body += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = Buffer.byteLength(body, 'binary');
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    body += `${String(offset).padStart(10, '0')} 00000 n \n`;
  });
  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(body, 'binary');
}

function safeFileSegment(value: string) {
  return (
    String(value || '')
      .trim()
      .replace(/[\\/:*?"<>|\s]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 40) || '收据'
  );
}

function safeStorageFileSegment(value: string) {
  return (
    String(value || '')
      .trim()
      .replace(/[^A-Za-z0-9_-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 40) || 'receipt'
  );
}

function leasePeriodSegment(lease?: Pick<Lease, 'startDate' | 'endDate'> | null) {
  const startDate = dateOnly(lease?.startDate);
  const endDate = dateOnly(lease?.endDate);

  if (startDate && endDate) {
    return `${startDate}至${endDate}`;
  }

  if (startDate) {
    return `自${startDate}`;
  }

  if (endDate) {
    return `至${endDate}`;
  }

  return '租约时间未知';
}

function buildReceiptFileName(receipt: Record<string, any>, lease?: Pick<Lease, 'startDate' | 'endDate'> | null) {
  const segments = [
    '收款收据',
    `房源${safeFileSegment(receipt.assetName)}`,
    `房间${safeFileSegment(receipt.roomName)}`,
    `租约${safeFileSegment(leasePeriodSegment(lease))}`,
    `租客${safeFileSegment(receipt.tenantName)}`,
    safeFileSegment(receipt.receiptNo)
  ];

  return `${segments.join('-')}.pdf`;
}

async function uploadPdf(fileName: string, buffer: Buffer, shouldSkipUpload: boolean) {
  if (shouldSkipUpload || !cloudSdk?.uploadFile) {
    return undefined;
  }

  const result = await cloudSdk.uploadFile({
    cloudPath: `receipt_pdfs/${fileName}`,
    fileContent: buffer
  });

  return result.fileID as string | undefined;
}

export async function main(event: ReceiptPdfEvent) {
  const db = resolveDb(event);
  const landlordOpenId = resolveLandlordOpenId(event);
  const generatedAt = resolveNow(event);
  const receipt = await getReceipt(db, landlordOpenId, String(event.receiptId || ''));
  const leases = await listAll<Lease>(db, COLLECTIONS.leases);
  const lease = leases.find((item) => item.id === receipt.leaseId && item.landlordOpenId === landlordOpenId);
  const fileName = buildReceiptFileName(receipt, lease);
  const storageFileName = `${safeStorageFileSegment(receipt.receiptNo)}-${safeStorageFileSegment(receipt.id)}.pdf`;
  const buffer = buildPdf(receipt, generatedAt);
  const fileID = await uploadPdf(storageFileName, buffer, Boolean(event.__mockDb));

  return {
    fileID,
    fileName,
    contentType: 'application/pdf',
    size: buffer.length,
    pdfBase64: event.__mockDb ? buffer.toString('base64') : undefined
  };
}
