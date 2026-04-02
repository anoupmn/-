const { callCloudFunction } = require('./cloud');

function submitQuickEntry(payload) {
  return callCloudFunction('quick-entry', payload);
}

module.exports = {
  submitQuickEntry
};
