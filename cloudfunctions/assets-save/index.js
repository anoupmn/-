'use strict';

const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const assets = db.collection('assets');
const rooms = db.collection('rooms');

function now() {
  return new Date().toISOString();
}

function createId(prefix) {
  return prefix + '_' + Math.random().toString(36).slice(2, 10);
}

function sanitizeAsset(input) {
  return {
    name: String(input.name || '').trim(),
    rentalMode: input.rentalMode === 'room' ? 'room' : 'whole',
    address: String(input.address || ''),
    note: String(input.note || '')
  };
}

exports.main = async (event = {}) => {
  const { OPENID } = cloud.getWXContext();
  const asset = sanitizeAsset(event.asset || {});
  const timestamp = now();

  if (!asset.name) {
    throw new Error('Asset name is required.');
  }

  if (event.assetId) {
    await assets.doc(event.assetId).update({
      data: {
        ...asset,
        updatedAt: timestamp
      }
    });

    const updated = await assets.doc(event.assetId).get();
    return {
      asset: updated.data,
      defaultRoom: null
    };
  }

  const assetId = createId('asset');
  await assets.add({
    data: {
      id: assetId,
      landlordOpenId: OPENID,
      ...asset,
      createdAt: timestamp,
      updatedAt: timestamp
    }
  });

  let defaultRoom = null;
  if (asset.rentalMode === 'whole') {
    defaultRoom = {
      id: createId('room'),
      landlordOpenId: OPENID,
      assetId,
      name: asset.name + ' 整租单元',
      note: '',
      isWholeUnitDefault: true,
      createdAt: timestamp,
      updatedAt: timestamp
    };

    await rooms.add({ data: defaultRoom });
  }

  return {
    asset: {
      id: assetId,
      landlordOpenId: OPENID,
      ...asset,
      createdAt: timestamp,
      updatedAt: timestamp
    },
    defaultRoom
  };
};
