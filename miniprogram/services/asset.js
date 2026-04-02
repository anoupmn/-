const { callCloudFunction } = require('./cloud');

function saveAsset(payload) {
  return callCloudFunction('assets-save', payload);
}

function listAssets() {
  return callCloudFunction('assets-list');
}

module.exports = {
  saveAsset,
  listAssets
};
