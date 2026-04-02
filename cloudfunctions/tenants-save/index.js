'use strict';

const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const tenants = db.collection('tenants');

function now() {
  return new Date().toISOString();
}

function createId(prefix) {
  return prefix + '_' + Math.random().toString(36).slice(2, 10);
}

exports.main = async (event = {}) => {
  const { OPENID } = cloud.getWXContext();
  const tenant = event.tenant || {};
  const payload = {
    name: String(tenant.name || '').trim(),
    phone: String(tenant.phone || ''),
    note: String(tenant.note || '')
  };
  const timestamp = now();

  if (!payload.name) {
    throw new Error('Tenant name is required.');
  }

  if (event.tenantId) {
    await tenants.doc(event.tenantId).update({
      data: {
        ...payload,
        updatedAt: timestamp
      }
    });
    const updated = await tenants.doc(event.tenantId).get();
    return updated.data;
  }

  const id = createId('tenant');
  const record = {
    id,
    landlordOpenId: OPENID,
    ...payload,
    createdAt: timestamp,
    updatedAt: timestamp
  };
  await tenants.add({ data: record });
  return record;
};
