'use strict';

const cloud = require('wx-server-sdk');

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

function getNextReceivableDate(lease, currentTime) {
  const current = new Date(currentTime);
  let next = dateOnly(lease.startDate);
  const end = dateOnly(lease.endDate);

  while (next < current && next < end) {
    next = new Date(next.getTime() + Number(lease.billingCycleDays || 30) * 24 * 60 * 60 * 1000);
  }

  return next.toISOString().slice(0, 10);
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

function labelForMainStatus(status) {
  return {
    occupied: '已出租',
    pending_move_in: '待入住',
    vacant: '空置'
  }[status] || '未知状态';
}

function labelForRiskTag(tag) {
  return {
    expiring: '即将到期',
    overdue: '已逾期',
    abnormal: '异常'
  }[tag] || tag;
}

exports.main = async () => {
  const currentTime = new Date().toISOString();
  const [assetRes, roomRes, tenantRes, leaseRes, billRes] = await Promise.all([
    db.collection('assets').get(),
    db.collection('rooms').get(),
    db.collection('tenants').get(),
    db.collection('leases').get(),
    db.collection('bills').get()
  ]);

  const ensuredBills = [...billRes.data];
  for (const lease of leaseRes.data) {
    if (deriveLeaseStatus(lease, currentTime) !== 'active') {
      continue;
    }

    if (ensuredBills.some((item) => item.leaseId === lease.id)) {
      continue;
    }

    const generatedBills = await ensureBillsForLease(lease, currentTime);
    ensuredBills.push(...generatedBills);
  }

  return roomRes.data.map((room) => {
    const asset = assetRes.data.find((item) => item.id === room.assetId);
    const leases = leaseRes.data.filter((item) => item.roomId === room.id);
    const activeLease = leases.find((item) => deriveLeaseStatus(item, currentTime) === 'active');
    const futureLease = leases
      .filter((item) => deriveLeaseStatus(item, currentTime) === 'future')
      .sort((a, b) => String(a.startDate).localeCompare(String(b.startDate)))[0];
    const tenant = activeLease ? tenantRes.data.find((item) => item.id === activeLease.tenantId) : null;

    let currentStatus = 'vacant';
    let nextReceivableDate = '';
    let nextReceivableAmount = 0;
    let overdueDays = 0;
    let vacancyDays = 0;
    const riskTags = [];

    if (activeLease) {
      const relatedBills = ensuredBills
        .filter((item) => item.leaseId === activeLease.id)
        .map((item) => ({
          ...item,
          status: deriveBillStatus(item, currentTime)
        }))
        .filter((item) => item.status !== 'paid')
        .sort((a, b) => String(a.dueDate).localeCompare(String(b.dueDate)));

      currentStatus = 'occupied';

      if (relatedBills.length) {
        nextReceivableDate = relatedBills[0].dueDate;
        nextReceivableAmount = Number(relatedBills[0].amount || 0);
      } else {
        nextReceivableDate = getNextReceivableDate(activeLease, currentTime);
        nextReceivableAmount = Number(activeLease.rentAmount || 0);
      }

      const hasExpiring =
        relatedBills.some((bill) => {
          const diff = Math.floor((dateOnly(bill.dueDate) - new Date(currentTime)) / (24 * 60 * 60 * 1000));
          return diff >= 0 && diff <= 15;
        }) ||
        Math.floor((dateOnly(activeLease.endDate) - new Date(currentTime)) / (24 * 60 * 60 * 1000)) <= 15;

      if (hasExpiring) {
        riskTags.push('expiring');
      }

      const overdueBill = relatedBills.find((bill) => bill.status === 'overdue');
      if (overdueBill) {
        riskTags.push('overdue', 'abnormal');
        overdueDays = Math.floor((new Date(currentTime) - dateOnly(overdueBill.dueDate)) / (24 * 60 * 60 * 1000));
      }
    } else if (futureLease) {
      currentStatus = 'pending_move_in';
    } else {
      const endedLease = leases
        .filter((item) => deriveLeaseStatus(item, currentTime) === 'ended')
        .sort((a, b) => String(b.endDate).localeCompare(String(a.endDate)))[0];

      if (endedLease) {
        vacancyDays = Math.floor((new Date(currentTime) - dateOnly(endedLease.endDate)) / (24 * 60 * 60 * 1000));
      }
    }

    let summaryHint = '';
    if (riskTags.indexOf('overdue') >= 0) {
      summaryHint = '已逾期 ' + overdueDays + ' 天';
    } else if (riskTags.indexOf('expiring') >= 0) {
      summaryHint = '15 天内有账单到期';
    } else if (currentStatus === 'vacant' && vacancyDays > 0) {
      summaryHint = '已空置 ' + vacancyDays + ' 天';
    }

    return {
      roomId: room.id,
      assetId: room.assetId,
      displayName: room.isWholeUnitDefault ? asset.name : asset.name + ' · ' + room.name,
      currentStatus,
      mainStatus: currentStatus,
      mainStatusLabel: labelForMainStatus(currentStatus),
      currentTenantName: tenant ? tenant.name : '',
      nextReceivableDate,
      nextReceivableAmount,
      hasAbnormal: riskTags.indexOf('abnormal') >= 0,
      riskTags,
      riskTagLabels: riskTags.map(labelForRiskTag),
      summaryHint,
      overdueDays,
      vacancyDays
    };
  });
};
