import { z } from 'zod';

const monthSchema = z.string().regex(/^\d{4}-\d{2}$/);

export const reportExportRequestSchema = z.object({
  month: monthSchema,
  assetId: z.string().optional(),
  roomId: z.string().optional()
});
export type ReportExportRequest = z.infer<typeof reportExportRequestSchema>;

export const reportExportMetadataSchema = z.object({
  id: z.string(),
  landlordOpenId: z.string(),
  month: monthSchema,
  assetId: z.string().nullable(),
  roomId: z.string().nullable(),
  fileID: z.string().optional(),
  fileName: z.string(),
  sheetNames: z.array(z.string()),
  summary: z.object({
    roomCount: z.number().int().nonnegative(),
    billCount: z.number().int().nonnegative(),
    ownerExpenseCount: z.number().int().nonnegative(),
    tenantIncomeTotal: z.number().nonnegative(),
    receivedTotal: z.number().nonnegative(),
    unpaidTotal: z.number().nonnegative(),
    ownerExpenseTotal: z.number().nonnegative()
  }),
  createdAt: z.string(),
  updatedAt: z.string()
});
export type ReportExportMetadata = z.infer<typeof reportExportMetadataSchema>;

export type MonthlyDetailRow = {
  序号: number;
  '房源/楼栋': string;
  '房号/房间': string;
  租客: string;
  '水（上月）': number | '';
  '水（本月）': number | '';
  '实用（方）': number | '';
  水费: number;
  '电（上月）': number | '';
  '电（本月）': number | '';
  '实用（度）': number | '';
  电费: number;
  '房租（元）': number;
  管理费: number;
  其他应收: number;
  维修费: number;
  其他支出: number;
  退租支出: number;
  房租水电合计: number;
  本月实收: number;
  本月未收: number;
  备注: string;
};

export type BillDetailRow = {
  '房源/楼栋': string;
  '房号/房间': string;
  租客: string;
  费用类型: string;
  费用性质: string;
  应收日期: string;
  应收金额: number;
  实收日期: string;
  实收金额: number | '';
  状态: string;
  来源: string;
  上期读数: number | '';
  本期读数: number | '';
  用量: number | '';
  单价: number | '';
  备注: string;
};

export type OwnerExpenseDetailRow = {
  '房源/楼栋': string;
  '房号/房间': string;
  支出类型: string;
  发生日期: string;
  金额: number | '';
  是否计入问题分析: string;
  备注: string;
};

export type CheckoutExpenseDetailRow = {
  '房源/楼栋': string;
  '房号/房间': string;
  租客: string;
  租约: string;
  退租日期: string;
  支出类型: string;
  金额: number | '';
  备注: string;
};

export type ReportWorkbookData = {
  月度明细: MonthlyDetailRow[];
  账单明细: BillDetailRow[];
  房东支出明细: OwnerExpenseDetailRow[];
  退租支出明细: CheckoutExpenseDetailRow[];
};
