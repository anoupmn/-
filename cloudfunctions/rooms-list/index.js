'use strict';

const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();

exports.main = async (event = {}) => {
  const { OPENID } = cloud.getWXContext();
  const assetId = String(event.assetId || '').trim();

  if (!assetId) {
    throw new Error('assetId is required.');
  }

  const result = await db
    .collection('rooms')
    .where({
      landlordOpenId: OPENID,
      assetId
    })
    .get();

  return (result.data || []).sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
};
