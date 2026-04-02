'use strict';

const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();

exports.main = async () => {
  const { OPENID } = cloud.getWXContext();
  const result = await db
    .collection('assets')
    .where({ landlordOpenId: OPENID })
    .get();

  return (result.data || []).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
};
