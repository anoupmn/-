'use strict';

const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();

async function listRoomRecords(collectionName, roomId, landlordOpenId) {
  const result = await db.collection(collectionName).where({ landlordOpenId, roomId }).get();
  return result.data || [];
}

exports.main = async (event = {}) => {
  const { OPENID } = cloud.getWXContext();
  const roomId = String(event.roomId || '').trim();

  if (!roomId) {
    throw new Error('roomId is required.');
  }

  const roomResult = await db.collection('rooms').where({ id: roomId, landlordOpenId: OPENID }).get();
  const room = roomResult.data[0];

  if (!room) {
    throw new Error(`Room ${roomId} not found.`);
  }

  const [leases, bills, receipts, repairs, ownerExpenses] = await Promise.all([
    listRoomRecords('leases', roomId, OPENID),
    listRoomRecords('bills', roomId, OPENID),
    listRoomRecords('receipts', roomId, OPENID),
    listRoomRecords('repair_records', roomId, OPENID),
    listRoomRecords('owner_expenses', roomId, OPENID)
  ]);

  const blockers = [];

  if (room.isWholeUnitDefault) {
    blockers.push({ code: 'whole_unit_default', count: 1 });
  }

  if (leases.length > 0) {
    blockers.push({ code: 'lease', count: leases.length });
  }

  if (bills.length > 0) {
    blockers.push({ code: 'bill', count: bills.length });
  }

  if (receipts.length > 0) {
    blockers.push({ code: 'receipt', count: receipts.length });
  }

  if (repairs.length > 0) {
    blockers.push({ code: 'repair_record', count: repairs.length });
  }

  if (ownerExpenses.length > 0) {
    blockers.push({ code: 'owner_expense', count: ownerExpenses.length });
  }

  const summary = {
    canDelete: blockers.length === 0,
    blockers
  };

  if (!summary.canDelete || event.mode !== 'delete' || event.confirm !== true) {
    return {
      ...summary,
      deleted: false
    };
  }

  await db.collection('rooms').doc(room._id).remove();

  return {
    ...summary,
    deleted: true
  };
};
