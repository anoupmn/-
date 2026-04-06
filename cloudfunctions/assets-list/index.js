'use strict';

const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();

function asNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function getLeaseSortKey(lease) {
  if (!lease || typeof lease !== 'object') {
    return '';
  }

  if (lease.createdAt) {
    return String(lease.createdAt);
  }

  if (lease.updatedAt) {
    return String(lease.updatedAt);
  }

  if (lease.startDate) {
    return `${lease.startDate}T00:00:00.000Z`;
  }

  return '';
}

function getLatestLease(leases) {
  if (!Array.isArray(leases) || leases.length === 0) {
    return null;
  }

  return leases
    .slice()
    .sort((a, b) => getLeaseSortKey(b).localeCompare(getLeaseSortKey(a)))[0] || null;
}

function getPropertyAmount(lease) {
  if (!lease || typeof lease !== 'object') {
    return null;
  }

  const feeRules = lease.feeRules && typeof lease.feeRules === 'object' ? lease.feeRules : null;
  const propertyRule = feeRules && feeRules.property && typeof feeRules.property === 'object'
    ? feeRules.property
    : null;

  return asNumber(propertyRule ? propertyRule.amount : null);
}

exports.main = async () => {
  const { OPENID } = cloud.getWXContext();
  const [assetRes, roomRes, leaseRes] = await Promise.all([
    db.collection('assets').where({ landlordOpenId: OPENID }).get(),
    db.collection('rooms').where({ landlordOpenId: OPENID }).get(),
    db.collection('leases').where({ landlordOpenId: OPENID }).get()
  ]);

  const assets = assetRes.data || [];
  const rooms = roomRes.data || [];
  const leases = leaseRes.data || [];

  const roomIdsByAssetId = new Map();
  rooms.forEach((room) => {
    const assetId = String(room.assetId || '');
    if (!assetId) {
      return;
    }

    const next = roomIdsByAssetId.get(assetId) || [];
    next.push(String(room.id || ''));
    roomIdsByAssetId.set(assetId, next);
  });

  const leasesByRoomId = new Map();
  leases.forEach((lease) => {
    const roomId = String(lease.roomId || '');
    if (!roomId) {
      return;
    }

    const next = leasesByRoomId.get(roomId) || [];
    next.push(lease);
    leasesByRoomId.set(roomId, next);
  });

  return assets
    .map((asset) => {
      const assetId = String(asset.id || '');
      const roomIds = roomIdsByAssetId.get(assetId) || [];
      const assetLeases = roomIds.reduce((acc, roomId) => {
        const roomLeases = leasesByRoomId.get(roomId) || [];
        return acc.concat(roomLeases);
      }, []);
      const latestLease = getLatestLease(assetLeases);

      return {
        ...asset,
        latestLeaseRentAmount: asNumber(latestLease ? latestLease.rentAmount : null),
        latestLeasePropertyAmount: getPropertyAmount(latestLease),
        latestLeaseAt: latestLease ? getLeaseSortKey(latestLease) : '',
        latestLeaseId: latestLease ? String(latestLease.id || '') : ''
      };
    })
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
};
