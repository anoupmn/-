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

  return {
    asset,
    room,
    activeLease,
    leaseHistory,
    tenantHistory
  };
};
