'use strict';

const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const leases = db.collection('leases');

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
  if (!event.leaseId) {
    throw new Error('leaseId is required.');
  }

  const timestamp = new Date().toISOString();
  const target = await leases.doc(event.leaseId).get();

  if (!target.data) {
    throw new Error('Lease not found.');
  }

  await leases.doc(event.leaseId).update({
    data: {
      closedAt: timestamp,
      updatedAt: timestamp
    }
  });

  const siblings = await leases.where({ roomId: target.data.roomId }).get();
  const hasFutureLease = siblings.data.some(
    (item) => item.id !== target.data.id && deriveLeaseStatus(item, timestamp) === 'future'
  );

  return {
    lease: {
      ...target.data,
      closedAt: timestamp,
      updatedAt: timestamp
    },
    currentStatus: hasFutureLease ? 'pending_move_in' : 'vacant'
  };
};
