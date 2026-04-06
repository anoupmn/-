const { getStorage, removeStorage, setStorage } = require('../utils/storage');
const { callCloudFunction } = require('./cloud');

const UNIT_LIST_DRILLDOWN_STORAGE_KEY = 'RZB_UNIT_LIST_DRILLDOWN_QUERY';

function normalizeQuery(query) {
  const payload = query || {};
  return {
    alertType: payload.alertType || '',
    mainStatus: payload.mainStatus || '',
    bucket: payload.bucket || '',
    roomId: payload.roomId || ''
  };
}

function hasDrilldownFilters(query) {
  const normalized = normalizeQuery(query);
  return !!(normalized.alertType || normalized.mainStatus || normalized.bucket || normalized.roomId);
}

function listRentableUnits() {
  return callCloudFunction('rentable-units-list');
}

function getRentableUnitDetail(payload) {
  return callCloudFunction('rentable-unit-detail', payload);
}

function stringifyUnitListQuery(query) {
  return Object.entries(normalizeQuery(query))
    .filter((entry) => typeof entry[1] === 'string' && entry[1])
    .map((entry) => entry[0] + '=' + encodeURIComponent(entry[1]))
    .join('&');
}

function parseUnitListQueryString(queryString) {
  const trimmed = String(queryString || '').trim().replace(/^\?/, '');
  if (!trimmed) {
    return normalizeQuery();
  }

  const segments = trimmed.split('&').filter(Boolean);
  const nextQuery = {};

  segments.forEach((segment) => {
    const chunks = segment.split('=');
    const rawKey = chunks[0] || '';
    const rawValue = chunks[1] || '';
    const key = decodeURIComponent(rawKey);

    if (!key) {
      return;
    }

    nextQuery[key] = decodeURIComponent(rawValue);
  });

  return normalizeQuery(nextQuery);
}

function parseUnitListUrl(url) {
  const parts = String(url || '').split('?');
  return parseUnitListQueryString(parts[1] || '');
}

function setPendingUnitListDrilldownQuery(query) {
  const normalized = normalizeQuery(query);
  if (!hasDrilldownFilters(normalized)) {
    removeStorage(UNIT_LIST_DRILLDOWN_STORAGE_KEY);
    return;
  }

  setStorage(UNIT_LIST_DRILLDOWN_STORAGE_KEY, normalized);
}

function consumePendingUnitListDrilldownQuery() {
  const cached = getStorage(UNIT_LIST_DRILLDOWN_STORAGE_KEY);
  removeStorage(UNIT_LIST_DRILLDOWN_STORAGE_KEY);

  if (!cached) {
    return null;
  }

  const normalized = normalizeQuery(cached);
  return hasDrilldownFilters(normalized) ? normalized : null;
}

module.exports = {
  listRentableUnits,
  getRentableUnitDetail,
  stringifyUnitListQuery,
  parseUnitListQueryString,
  parseUnitListUrl,
  setPendingUnitListDrilldownQuery,
  consumePendingUnitListDrilldownQuery
};
