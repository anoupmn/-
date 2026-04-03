'use strict';

const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();

exports.main = async (event = {}) => {
  if (!event.billId) {
    throw new Error('billId is required.');
  }

  if (!event.receivedAt) {
    throw new Error('receivedAt is required.');
  }

  if (!Number(event.receivedAmount)) {
    throw new Error('receivedAmount is required.');
  }

  const collection = db.collection('bills');
  const result = await collection.where({ id: event.billId }).get();
  const current = result.data[0];

  if (!current) {
    throw new Error('Bill not found.');
  }

  await collection.doc(current._id).update({
    data: {
      receivedAt: event.receivedAt,
      receivedAmount: Number(event.receivedAmount),
      status: 'paid',
      updatedAt: new Date().toISOString()
    }
  });

  const updated = await collection.doc(current._id).get();
  return updated.data;
};
