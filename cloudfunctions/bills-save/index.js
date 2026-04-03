'use strict';

const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();

function createId(prefix) {
  return prefix + '_' + Math.random().toString(36).slice(2, 10);
}

exports.main = async (event = {}) => {
  if (!event.leaseId) {
    throw new Error('leaseId is required.');
  }

  if (!event.monthKey) {
    throw new Error('monthKey is required.');
  }

  if (!event.type) {
    throw new Error('type is required.');
  }

  if (!Number(event.amount)) {
    throw new Error('amount must be greater than 0.');
  }

  const leaseRes = await db.collection('leases').where({ id: event.leaseId }).get();
  const lease = leaseRes.data[0];

  if (!lease) {
    throw new Error('Lease not found.');
  }

  const createdAt = new Date().toISOString();
  const bill = {
    id: createId('bill'),
    landlordOpenId: lease.landlordOpenId,
    leaseId: lease.id,
    roomId: lease.roomId,
    type: event.type,
    section: event.type === 'rent' ? 'rent' : event.type === 'deposit' ? 'deposit' : 'non_rent',
    dueDate: String(event.monthKey) + '-01',
    amount: Number(event.amount),
    status: 'pending',
    receivedAt: null,
    receivedAmount: null,
    note: '',
    itemKey: event.type === 'custom' ? 'manual_' + Date.now() : undefined,
    itemLabel: event.itemLabel ? String(event.itemLabel) : undefined,
    source: 'manual',
    createdAt,
    updatedAt: createdAt
  };

  await db.collection('bills').add({ data: bill });
  return bill;
};
