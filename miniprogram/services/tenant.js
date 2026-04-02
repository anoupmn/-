const { callCloudFunction } = require('./cloud');

function saveTenant(payload) {
  return callCloudFunction('tenants-save', payload);
}

module.exports = {
  saveTenant
};
