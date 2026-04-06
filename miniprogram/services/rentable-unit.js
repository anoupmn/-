const { callCloudFunction } = require('./cloud');

function listRentableUnits() {
  return callCloudFunction('rentable-units-list');
}

function getRentableUnitDetail(payload) {
  return callCloudFunction('rentable-unit-detail', payload);
}

function stringifyUnitListQuery(query) {
  return Object.entries(query || {})
    .filter((entry) => typeof entry[1] === 'string' && entry[1])
    .map((entry) => entry[0] + '=' + encodeURIComponent(entry[1]))
    .join('&');
}

module.exports = {
  listRentableUnits,
  getRentableUnitDetail,
  stringifyUnitListQuery
};
