import { getReceipt } from './shared/repositories/receipt-repository';
import { resolveDb, resolveLandlordOpenId, resolveNow, type CloudEventBase } from './shared/runtime';

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

function pdfText(value: string, x: number, y: number, size = 11) {
  return `BT /F1 ${size} Tf ${x} ${y} Td <${utf16Hex(value)}> Tj ET`;
}

function money(value: unknown) {
  return `¥${Number(value || 0).toFixed(2)}`;
}

function buildPdf(receipt: Record<string, any>, generatedAt: string) {
  const lines = [
    pdfText('收款收据（非发票）', 210, 790, 18),
    pdfText(`收据编号：${receipt.receiptNo || ''}`, 72, 755),
    pdfText(`房源/房间：${receipt.assetName || ''} / ${receipt.roomName || ''}`, 72, 735),
    pdfText(`租客：${receipt.tenantName || ''}`, 72, 715),
    pdfText(`收款日期：${receipt.receivedAt || ''}`, 72, 695),
    pdfText(`状态：${receipt.status === 'voided' ? '已作废' : '有效'}`, 72, 675),
    pdfText('收款项目明细', 72, 640, 13),
    ...((receipt.items || []) as Array<Record<string, any>>).flatMap((item, index) => {
      const y = 615 - index * 42;
      return [
        pdfText(`${index + 1}. ${item.itemLabel || ''}`, 86, y),
        pdfText(`应收日期：${item.dueDate || ''}`, 100, y - 16),
        pdfText(`实收日期：${item.receivedAt || ''}`, 230, y - 16),
        pdfText(`金额：${money(item.receivedAmount)}`, 410, y - 16)
      ];
    }),
    pdfText(`合计金额：${money(receipt.totalAmount)}`, 72, 170, 14),
    pdfText(`收款人：${receipt.collectorName || '未填写'}`, 72, 145),
    pdfText(`生成时间：${receipt.createdAt || ''}`, 72, 125),
    ...(receipt.voidReason ? [pdfText(`作废原因：${receipt.voidReason}`, 72, 105)] : []),
    ...(receipt.reissueFromReceiptId ? [pdfText('由作废收据重开', 72, 85)] : []),
    pdfText(`PDF生成时间：${generatedAt}`, 72, 50, 9)
  ];
  const content = lines.join('\n');
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type0 /BaseFont /STSong-Light /Encoding /UniGB-UCS2-H /DescendantFonts [6 0 R] >>',
    `<< /Length ${Buffer.byteLength(content, 'binary')} >>\nstream\n${content}\nendstream`,
    '<< /Type /Font /Subtype /CIDFontType0 /BaseFont /STSong-Light /CIDSystemInfo << /Registry (Adobe) /Ordering (GB1) /Supplement 2 >> /FontDescriptor 7 0 R >>',
    '<< /Type /FontDescriptor /FontName /STSong-Light /Flags 6 /FontBBox [0 -200 1000 900] /ItalicAngle 0 /Ascent 800 /Descent -200 /CapHeight 700 /StemV 80 >>'
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
  const fileName = `${safeFileSegment(receipt.receiptNo)}-${safeFileSegment(receipt.tenantName)}-收款收据.pdf`;
  const buffer = buildPdf(receipt, generatedAt);
  const fileID = await uploadPdf(fileName, buffer, Boolean(event.__mockDb));

  return {
    fileID,
    fileName,
    contentType: 'application/pdf',
    size: buffer.length,
    pdfBase64: event.__mockDb ? buffer.toString('base64') : undefined
  };
}
