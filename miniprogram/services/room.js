const { callCloudFunction } = require('./cloud');

function saveRoom(payload) {
  return callCloudFunction('rooms-save', payload);
}

function deleteRoom(payload) {
  return callCloudFunction('rooms-delete', payload);
}

function listRoomsByAsset(assetId) {
  return callCloudFunction('rooms-list', { assetId });
}

module.exports = {
  saveRoom,
  deleteRoom,
  listRoomsByAsset
};
