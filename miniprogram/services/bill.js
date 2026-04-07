const { callCloudFunction } = require('./cloud');

function receiveBill(payload) {
  return callCloudFunction('bills-receive', payload);
}

function saveBill(payload) {
  return callCloudFunction('bills-save', payload);
}

function deleteBill(payload) {
  return callCloudFunction('bills-save', {
    mode: 'delete',
    ...payload
  });
}

module.exports = {
  receiveBill,
  saveBill,
  deleteBill
};
