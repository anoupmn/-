'use strict';

const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async (event = {}) => {
  const { OPENID } = cloud.getWXContext();
  const displayName = (event.displayName || '房东').trim() || '房东';
  const now = new Date().toISOString();

  return {
    session: {
      openid: OPENID,
      displayName,
      lastLoginAt: now,
      role: 'landlord'
    }
  };
};
