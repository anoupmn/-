const { callCloudFunction } = require('./cloud');

function listAlertGroups() {
  return callCloudFunction('alerts-list');
}

module.exports = {
  listAlertGroups
};
