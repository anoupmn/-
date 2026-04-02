'use strict';

const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const assets = db.collection('assets');
const rooms = db.collection('rooms');
const tenants = db.collection('tenants');
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
  const timestamp = now();
  const assetInput = event.asset || {};
  const tenantInput = event.tenant || {};
  const leaseInput = event.lease || {};
  const rentalMode = assetInput.rentalMode === 'room' ? 'room' : 'whole';

  if (!assetInput.name || !tenantInput.name || !leaseInput.startDate || !leaseInput.endDate) {
    throw new Error('Quick entry payload is incomplete.');
  }

  const asset = {
    id: createId('asset'),
    landlordOpenId: OPENID,
    name: String(assetInput.name).trim(),
    rentalMode,
    address: String(assetInput.address || ''),
    note: String(assetInput.note || ''),
    createdAt: timestamp,
    updatedAt: timestamp
  };
  await assets.add({ data: asset });

  const createdRooms = [];
  if (rentalMode === 'whole') {
    const wholeRoom = {
      id: createId('room'),
      landlordOpenId: OPENID,
      assetId: asset.id,
      name: asset.name + ' 整租单元',
      note: '',
      isWholeUnitDefault: true,
      createdAt: timestamp,
      updatedAt: timestamp
    };
    await rooms.add({ data: wholeRoom });
    createdRooms.push(wholeRoom);
  } else {
    const inputRooms = Array.isArray(event.rooms) ? event.rooms : [];
    for (const item of inputRooms) {
      const room = {
        id: createId('room'),
        landlordOpenId: OPENID,
        assetId: asset.id,
        name: String(item.name || '房间 1'),
        note: String(item.note || ''),
        isWholeUnitDefault: Boolean(item.isWholeUnitDefault),
        createdAt: timestamp,
        updatedAt: timestamp
      };
      await rooms.add({ data: room });
      createdRooms.push(room);
    }
  }

  const tenant = {
    id: createId('tenant'),
    landlordOpenId: OPENID,
    name: String(tenantInput.name).trim(),
    phone: String(tenantInput.phone || ''),
    note: String(tenantInput.note || ''),
    createdAt: timestamp,
    updatedAt: timestamp
  };
  await tenants.add({ data: tenant });

  const targetRoom = createdRooms[0];
  if (!targetRoom) {
    throw new Error('Quick entry needs at least one room.');
  }

  const existing = await leases.where({ roomId: targetRoom.id }).get();
  const conflict = existing.data.find((item) => deriveLeaseStatus(item, timestamp) === 'active');
  const draftLease = {
    startDate: String(leaseInput.startDate || ''),
    endDate: String(leaseInput.endDate || ''),
    closedAt: null
  };

  if (conflict && deriveLeaseStatus(draftLease, timestamp) === 'active') {
    throw new Error('A room can only have one active lease at a time.');
  }

  const lease = {
    id: createId('lease'),
    landlordOpenId: OPENID,
    roomId: targetRoom.id,
    tenantId: tenant.id,
    startDate: String(leaseInput.startDate),
    endDate: String(leaseInput.endDate),
    billingCycleDays: Number(leaseInput.billingCycleDays || 30),
    rentAmount: Number(leaseInput.rentAmount || 0),
    depositAmount: Number(leaseInput.depositAmount || 0),
    note: String(leaseInput.note || ''),
    closedAt: null,
    createdAt: timestamp,
    updatedAt: timestamp
  };
  await leases.add({ data: lease });

  return {
    mode: 'quick-entry',
    asset,
    rooms: createdRooms,
    tenant,
    lease
  };
};
