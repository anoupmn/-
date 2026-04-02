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

exports.main = async () => {
  const currentTime = new Date().toISOString();
  const [assetRes, roomRes, tenantRes, leaseRes] = await Promise.all([
    db.collection('assets').get(),
    db.collection('rooms').get(),
    db.collection('tenants').get(),
    db.collection('leases').get()
  ]);

  return roomRes.data.map((room) => {
    const asset = assetRes.data.find((item) => item.id === room.assetId);
    const leases = leaseRes.data.filter((item) => item.roomId === room.id);
    const activeLease = leases.find((item) => deriveLeaseStatus(item, currentTime) === 'active');
    const futureLease = leases
      .filter((item) => deriveLeaseStatus(item, currentTime) === 'future')
      .sort((a, b) => String(a.startDate).localeCompare(String(b.startDate)))[0];
    const tenant = activeLease
      ? tenantRes.data.find((item) => item.id === activeLease.tenantId)
      : null;

    let currentStatus = 'vacant';
    let nextReceivableDate = '';
    let nextReceivableAmount = 0;
    let overdueDays = 0;
    let vacancyDays = 0;

    if (activeLease) {
      nextReceivableDate = getNextReceivableDate(activeLease, currentTime);
      nextReceivableAmount = Number(activeLease.rentAmount || 0);
      const due = dateOnly(nextReceivableDate);
      const nowDate = new Date(currentTime);

      if (due < nowDate) {
        currentStatus = 'overdue';
        overdueDays = Math.floor((nowDate - due) / (24 * 60 * 60 * 1000));
      } else {
        currentStatus = 'occupied';
      }
    } else if (futureLease) {
      currentStatus = 'pending_move_in';
    } else {
      const endedLease = leases
        .filter((item) => deriveLeaseStatus(item, currentTime) === 'ended')
        .sort((a, b) => String(b.endDate).localeCompare(String(a.endDate)))[0];

      if (endedLease) {
        vacancyDays = Math.floor(
          (new Date(currentTime) - dateOnly(endedLease.endDate)) / (24 * 60 * 60 * 1000)
        );
      }
    }

    return {
      roomId: room.id,
      assetId: room.assetId,
      displayName: room.isWholeUnitDefault ? asset.name : asset.name + ' · ' + room.name,
      currentStatus,
      currentTenantName: tenant ? tenant.name : '',
      nextReceivableDate,
      nextReceivableAmount,
      hasAbnormal: currentStatus === 'overdue',
      overdueDays,
      vacancyDays
    };
  });
};
