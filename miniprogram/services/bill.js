const { callCloudFunction } = require('./cloud');

function receiveBill(payload) {
  return callCloudFunction('bills-receive', payload);
}

function saveBill(payload) {
  return callCloudFunction('bills-save', payload);
}

module.exports = {
  receiveBill,
  saveBill
};
