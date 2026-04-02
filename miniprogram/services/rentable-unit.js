const { callCloudFunction } = require('./cloud');

function listRentableUnits() {
  return callCloudFunction('rentable-units-list');
}

function getRentableUnitDetail(payload) {
  return callCloudFunction('rentable-unit-detail', payload);
}

module.exports = {
  listRentableUnits,
  getRentableUnitDetail
};
