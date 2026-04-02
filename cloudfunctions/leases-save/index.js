'use strict';

const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const leases = db.collection('leases');

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
  return record;
};
