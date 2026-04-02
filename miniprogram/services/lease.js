const { callCloudFunction } = require('./cloud');

function saveLease(payload) {
  return callCloudFunction('leases-save', payload);
}

function endLease(payload) {
  return callCloudFunction('leases-end', payload);
}

module.exports = {
  saveLease,
  endLease
};
