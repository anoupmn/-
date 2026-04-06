const { callCloudFunction } = require('./cloud');

function getHomeDashboard() {
  return callCloudFunction('dashboard-home');
}

module.exports = {
  getHomeDashboard
};
