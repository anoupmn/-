const { callCloudFunction } = require('./cloud');

function saveRoom(payload) {
  return callCloudFunction('rooms-save', payload);
}

function listRoomsByAsset(assetId) {
  return callCloudFunction('rooms-list', { assetId });
}

module.exports = {
  saveRoom,
  listRoomsByAsset
};
