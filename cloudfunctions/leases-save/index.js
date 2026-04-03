'use strict';

const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const leases = db.collection('leases');
const bills = db.collection('bills');

function now() {
  return new Date().toISOString();
}

function createId(prefix) {
  return prefix + '_' + Math.random().toString(36).slice(2, 10);
}

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

function buildDefaultFeeRules(payload) {
  return {
    rent: {
      amount: Number(payload.rentAmount || 0),
      cadence: 'cycle'
    },
    deposit: {
      amount: Number(payload.depositAmount || 0),
      cadence: 'once'
    },
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

async function syncBillsForLease(leaseRecord, currentTime) {
  const existing = await bills.where({ leaseId: leaseRecord.id }).get();
  await Promise.all(existing.data.map((item) => bills.doc(item._id).remove()));

  const dueDates = buildRecurringDueDates(leaseRecord);
  const feeItems = mapFeeItems(leaseRecord);
  const records = [];

  feeItems.forEach((item) => {
    const targetDueDates = item.cadence === 'once' ? [leaseRecord.startDate] : dueDates;
    targetDueDates.forEach((dueDate) => {
      const record = {
        id: createId('bill'),
        landlordOpenId: leaseRecord.landlordOpenId,
        leaseId: leaseRecord.id,
        roomId: leaseRecord.roomId,
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
        source: 'system',
        createdAt: currentTime,
        updatedAt: currentTime
      };
      record.status = deriveBillStatus(record, currentTime);
      records.push(record);
    });
  });

  await Promise.all(records.map((record) => bills.add({ data: record })));
}

exports.main = async (event = {}) => {
  const { OPENID } = cloud.getWXContext();
  const lease = event.lease || {};
  const payload = {
    roomId: String(lease.roomId || '').trim(),
    tenantId: String(lease.tenantId || '').trim(),
    startDate: String(lease.startDate || '').trim(),
    endDate: String(lease.endDate || '').trim(),
    billingCycleDays: Number(lease.billingCycleDays || 30),
    rentAmount: Number(lease.rentAmount || 0),
    depositAmount: Number(lease.depositAmount || 0),
    feeRules: normalizeFeeRules({
      ...lease,
      rentAmount: Number(lease.rentAmount || 0),
      depositAmount: Number(lease.depositAmount || 0)
    }),
    note: String(lease.note || '')
  };
  const timestamp = now();

  if (!payload.roomId || !payload.tenantId || !payload.startDate || !payload.endDate) {
    throw new Error('Lease core fields are required.');
  }

  if (!event.leaseId) {
    const existing = await leases.where({ roomId: payload.roomId }).get();
    const conflict = existing.data.find((item) => deriveLeaseStatus(item, timestamp) === 'active');
    const nextStatus = deriveLeaseStatus({ ...payload, closedAt: null }, timestamp);

    if (conflict && nextStatus === 'active') {
      throw new Error('A room can only have one active lease at a time.');
    }
  }

  if (event.leaseId) {
    await leases.doc(event.leaseId).update({
      data: {
        ...payload,
        updatedAt: timestamp
      }
    });
    const updated = await leases.doc(event.leaseId).get();
    await syncBillsForLease(updated.data, timestamp);
    return updated.data;
  }

  const id = createId('lease');
  const record = {
    id,
    landlordOpenId: OPENID,
    ...payload,
    closedAt: null,
    createdAt: timestamp,
    updatedAt: timestamp
  };
  await leases.add({ data: record });
  await syncBillsForLease(record, timestamp);
  return record;
};
