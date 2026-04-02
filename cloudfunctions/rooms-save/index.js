'use strict';

const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const rooms = db.collection('rooms');

function now() {
  return new Date().toISOString();
}

function createId(prefix) {
  return prefix + '_' + Math.random().toString(36).slice(2, 10);
}

exports.main = async (event = {}) => {
  const { OPENID } = cloud.getWXContext();
  const room = event.room || {};
  const payload = {
    assetId: String(room.assetId || '').trim(),
    name: String(room.name || '').trim(),
    note: String(room.note || ''),
    isWholeUnitDefault: Boolean(room.isWholeUnitDefault)
  };
  const timestamp = now();

  if (!payload.assetId || !payload.name) {
    throw new Error('assetId and room name are required.');
  }

  if (event.roomId) {
    await rooms.doc(event.roomId).update({
      data: {
        ...payload,
        updatedAt: timestamp
      }
    });
    const updated = await rooms.doc(event.roomId).get();
    return updated.data;
  }

  const id = createId('room');
  const record = {
    id,
    landlordOpenId: OPENID,
    ...payload,
    createdAt: timestamp,
    updatedAt: timestamp
  };
  await rooms.add({ data: record });
  return record;
};
