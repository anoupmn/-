const { callCloudFunction } = require('./cloud');

function saveAsset(payload) {
  return callCloudFunction('assets-save', payload);
}

function listAssets() {
  return callCloudFunction('assets-list');
}

function deleteAsset(payload) {
  return callCloudFunction('assets-delete', payload);
}

module.exports = {
  saveAsset,
  listAssets,
  deleteAsset
};
