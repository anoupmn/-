'use strict';

const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();

async function removeByIds(collectionName, ids, landlordOpenId) {
  if (!ids.length) {
    return;
  }

  const result = await db.collection(collectionName).where({ landlordOpenId }).get();
  const targets = (result.data || []).filter((item) => ids.indexOf(item.id) >= 0);
  await Promise.all(targets.map((item) => db.collection(collectionName).doc(item._id).remove()));
}

exports.main = async (event = {}) => {
  const { OPENID } = cloud.getWXContext();
  const assetId = String(event.assetId || '').trim();

  if (!assetId) {
    throw new Error('assetId is required.');
  }

  const [assetRes, roomRes, leaseRes, billRes] = await Promise.all([
    db.collection('assets').where({ id: assetId, landlordOpenId: OPENID }).get(),
    db.collection('rooms').where({ landlordOpenId: OPENID }).get(),
    db.collection('leases').where({ landlordOpenId: OPENID }).get(),
    db.collection('bills').where({ landlordOpenId: OPENID }).get()
  ]);

  const asset = assetRes.data[0];
  if (!asset) {
    throw new Error('Asset not found.');
  }

  const rooms = (roomRes.data || []).filter((item) => item.assetId === assetId);
  const roomIds = rooms.map((item) => item.id);
  const leases = (leaseRes.data || []).filter((item) => roomIds.indexOf(item.roomId) >= 0);
  const leaseIds = leases.map((item) => item.id);
  const bills = (billRes.data || []).filter((item) => leaseIds.indexOf(item.leaseId) >= 0);

  await Promise.all((billRes.data || [])
    .filter((item) => bills.some((bill) => bill.id === item.id))
    .map((item) => db.collection('bills').doc(item._id).remove()));

  await removeByIds('leases', leaseIds, OPENID);
  await removeByIds('rooms', roomIds, OPENID);
  await db.collection('assets').doc(asset._id).remove();

  return {
    deletedAssetId: assetId,
    removedRooms: roomIds.length,
    removedLeases: leaseIds.length,
    removedBills: bills.length
  };
};
