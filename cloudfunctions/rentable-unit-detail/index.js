'use strict';

const cloud = require('wx-server-sdk');
const dayjs = require('dayjs');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();

function dateOnly(value) {
  return new Date(String(value) + 'T00:00:00');
}

function deriveLeaseStatus(lease, currentTime) {
  if (lease.closedAt) {
    return 'ended';
  }

  const nowDate = new Date(currentTime);
  const startDate = dateOnly(lease.startDate);
  const endDate = dateOnly(lease.endDate);

  if (nowDate < startDate) {
    return 'future';
  }

  if (nowDate > endDate) {
    return 'ended';
  }

  return 'active';
}

function deriveBillStatus(bill, currentTime) {
  if (bill.receivedAt && bill.receivedAmount !== null && bill.receivedAmount !== undefined) {
    return 'paid';
  }

  const due = dateOnly(bill.dueDate);
  const nowDate = new Date(currentTime);

  if (due.toISOString().slice(0, 10) === nowDate.toISOString().slice(0, 10)) {
    return 'due_today';
  }

  if (bill.type !== 'deposit' && due < nowDate) {
    return 'overdue';
  }

  return 'pending';
}

function buildDefaultFeeRules(lease) {
  return {
    rent: { amount: Number(lease.rentAmount || 0), cadence: 'cycle' },
    deposit: { amount: Number(lease.depositAmount || 0), cadence: 'once' },
    customFeeItems: []
  };
}

function normalizeFeeRules(lease) {
  const feeRules = lease.feeRules || buildDefaultFeeRules(lease);
  return {
    ...feeRules,
    rent: {
      amount: Number((feeRules.rent && feeRules.rent.amount) || lease.rentAmount || 0),
      cadence: (feeRules.rent && feeRules.rent.cadence) || 'cycle'
    },
    deposit: {
      amount: Number((feeRules.deposit && feeRules.deposit.amount) || lease.depositAmount || 0),
      cadence: (feeRules.deposit && feeRules.deposit.cadence) || 'once'
    },
    customFeeItems: Array.isArray(feeRules.customFeeItems) ? feeRules.customFeeItems : []
  };
}

function buildRecurringDueDates(lease) {
  const dueDates = [];
  const cycleDays = Number(lease.billingCycleDays || 30);
  let current = dateOnly(lease.startDate);
  const end = dateOnly(lease.endDate);

  while (current <= end) {
    dueDates.push(current.toISOString().slice(0, 10));
    current = new Date(current.getTime() + cycleDays * 24 * 60 * 60 * 1000);
  }

  return dueDates;
}

function mapFeeItems(lease) {
  const feeRules = normalizeFeeRules(lease);
  const items = [
    { type: 'rent', section: 'rent', amount: Number(feeRules.rent.amount || 0), cadence: feeRules.rent.cadence },
    { type: 'deposit', section: 'deposit', amount: Number(feeRules.deposit.amount || 0), cadence: feeRules.deposit.cadence }
  ];

  ['water', 'electricity', 'property', 'misc'].forEach((key) => {
    const rule = feeRules[key];
    if (rule && Number(rule.amount || 0) > 0) {
      items.push({
        type: key,
        section: 'non_rent',
        amount: Number(rule.amount || 0),
        cadence: rule.cadence || 'cycle'
      });
    }
  });

  feeRules.customFeeItems.forEach((item) => {
    if (Number(item.amount || 0) > 0) {
      items.push({
        type: 'custom',
        section: 'non_rent',
        amount: Number(item.amount || 0),
        cadence: item.cadence || 'cycle',
        itemKey: item.key,
        itemLabel: item.label
      });
    }
  });

  return items;
}

async function ensureBillsForLease(lease, currentTime) {
  const existing = await db.collection('bills').where({ leaseId: lease.id }).get();
  if ((existing.data || []).length) {
    return existing.data;
  }

  const dueDates = buildRecurringDueDates(lease);
  const feeItems = mapFeeItems(lease);
  const records = [];

  feeItems.forEach((item) => {
    const targetDueDates = item.cadence === 'once' ? [lease.startDate] : dueDates;
    targetDueDates.forEach((dueDate) => {
      records.push({
        id: 'bill_' + Math.random().toString(36).slice(2, 10),
        landlordOpenId: lease.landlordOpenId,
        leaseId: lease.id,
        roomId: lease.roomId,
        type: item.type,
        section: item.section,
        dueDate,
        amount: Number(item.amount || 0),
        status: 'pending',
        receivedAt: null,
        receivedAmount: null,
        note: '',
        itemKey: item.itemKey,
        itemLabel: item.itemLabel,
        createdAt: currentTime,
        updatedAt: currentTime
      });
    });
  });

  await Promise.all(records.map((record) => db.collection('bills').add({ data: record })));
  return records;
}

function buildUnitSummary(asset, room, activeLease, tenant, relatedBills, currentTime) {
  const outstandingBills = relatedBills
    .map((bill) => ({ ...bill, status: deriveBillStatus(bill, currentTime) }))
    .filter((bill) => bill.status !== 'paid')
    .sort((a, b) => String(a.dueDate).localeCompare(String(b.dueDate)));

  const riskTagLabels = [];
  const nextReceivableDate = outstandingBills[0] ? outstandingBills[0].dueDate : '';
  const nextReceivableAmount = outstandingBills[0] ? Number(outstandingBills[0].amount || 0) : 0;

  if (
    outstandingBills.some((bill) => {
      const diff = Math.floor((dateOnly(bill.dueDate) - new Date(currentTime)) / (24 * 60 * 60 * 1000));
      return diff >= 0 && diff <= 15;
    })
  ) {
    riskTagLabels.push('即将到期');
  }

  const overdueBill = outstandingBills.find((bill) => bill.status === 'overdue');
  if (overdueBill) {
    riskTagLabels.push('已逾期', '异常');
  }

  return {
    displayName: room.isWholeUnitDefault ? asset.name : asset.name + ' · ' + room.name,
    mainStatus: activeLease ? 'occupied' : 'vacant',
    mainStatusLabel: activeLease ? '已出租' : '空置',
    riskTags: riskTagLabels.map((item) => (item === '即将到期' ? 'expiring' : item === '已逾期' ? 'overdue' : 'abnormal')),
    riskTagLabels,
    currentTenantName: tenant ? tenant.name : '',
    nextReceivableDate,
    nextReceivableAmount,
    summaryHint: overdueBill
      ? '已逾期 ' + Math.floor((new Date(currentTime) - dateOnly(overdueBill.dueDate)) / (24 * 60 * 60 * 1000)) + ' 天'
      : riskTagLabels.indexOf('即将到期') >= 0
        ? '15 天内有账单到期'
        : '',
    overdueHint: overdueBill ? '当前有 1 笔账单已逾期' : '',
    generatedAt: currentTime.slice(0, 10)
  };
}

function getBillTypeLabel(bill) {
  if (bill.itemLabel) {
    return bill.itemLabel;
  }

  return {
    rent: '租金',
    deposit: '押金',
    water: '水费',
    electricity: '电费',
    property: '管理费',
    misc: '杂费',
    custom: '其他费用'
  }[bill.type] || bill.type;
}

function buildMonthlyBillGroups(relatedBills, currentTime) {
  const monthMap = new Map();
  const currentMonth = dayjs(currentTime).format('YYYY-MM');

  relatedBills
    .slice()
    .sort((a, b) => {
      const sourceRankA = a.source === 'manual' ? 1 : 0;
      const sourceRankB = b.source === 'manual' ? 1 : 0;

      if (sourceRankA !== sourceRankB) {
        return sourceRankA - sourceRankB;
      }

      return String(a.dueDate).localeCompare(String(b.dueDate));
    })
    .forEach((bill) => {
      const monthKey = String(bill.dueDate).slice(0, 7);
      if (!monthMap.has(monthKey)) {
        monthMap.set(monthKey, {
          monthKey,
          monthLabel: dayjs(monthKey + '-01').format('YYYY年MM月'),
          isCurrentMonth: monthKey === currentMonth,
          expandedByDefault: monthKey === currentMonth,
          items: []
        });
      }

      monthMap.get(monthKey).items.push({
        id: bill.id,
        type: bill.type,
        section: bill.section,
        label: getBillTypeLabel(bill),
        dueDate: bill.dueDate,
        amount: Number(bill.amount || 0),
        status: deriveBillStatus(bill, currentTime),
        receivedAt: bill.receivedAt || null,
        receivedAmount: bill.receivedAmount == null ? null : Number(bill.receivedAmount)
      });
    });

  return Array.from(monthMap.values()).sort((a, b) => String(a.monthKey).localeCompare(String(b.monthKey)));
}

exports.main = async (event = {}) => {
  if (!event.roomId) {
    throw new Error('roomId is required.');
  }

  const currentTime = new Date().toISOString();
  const [assetRes, roomRes, tenantRes, leaseRes] = await Promise.all([
    db.collection('assets').get(),
    db.collection('rooms').get(),
    db.collection('tenants').get(),
    db.collection('leases').get()
  ]);

  const room = roomRes.data.find((item) => item.id === event.roomId);
  if (!room) {
    throw new Error('Room not found.');
  }

  const asset = assetRes.data.find((item) => item.id === room.assetId);
  const leaseHistory = leaseRes.data
    .filter((item) => item.roomId === room.id)
    .sort((a, b) => String(a.startDate).localeCompare(String(b.startDate)));
  const activeLease = leaseHistory.find((item) => deriveLeaseStatus(item, currentTime) === 'active') || null;
  const tenantHistory = leaseHistory
    .map((lease) => tenantRes.data.find((tenant) => tenant.id === lease.tenantId))
    .filter(Boolean);
  const currentTenant = activeLease ? tenantRes.data.find((tenant) => tenant.id === activeLease.tenantId) || null : null;
  const relatedBills = activeLease ? await ensureBillsForLease(activeLease, currentTime) : [];

  return {
    asset,
    room,
    activeLease,
    leaseHistory,
    tenantHistory,
    summaryCard: buildUnitSummary(asset, room, activeLease, currentTenant, relatedBills, currentTime),
    monthlyBillGroups: buildMonthlyBillGroups(relatedBills, currentTime),
    historyCollapsedByDefault: true
  };
};
