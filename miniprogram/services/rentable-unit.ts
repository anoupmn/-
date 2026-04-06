import { getStorage, removeStorage, setStorage } from '../utils/storage';
import { callCloudFunction } from './cloud';

export type UnitListDrilldownQuery = {
  alertType?: string;
  mainStatus?: string;
  bucket?: string;
  roomId?: string;
};

const UNIT_LIST_DRILLDOWN_STORAGE_KEY = 'RZB_UNIT_LIST_DRILLDOWN_QUERY';

function normalizeQuery(query: UnitListDrilldownQuery = {}) {
  return {
    alertType: query.alertType || '',
    mainStatus: query.mainStatus || '',
    bucket: query.bucket || '',
    roomId: query.roomId || ''
  };
}

function hasDrilldownFilters(query: UnitListDrilldownQuery) {
  const normalized = normalizeQuery(query);
  return Boolean(normalized.alertType || normalized.mainStatus || normalized.bucket || normalized.roomId);
}

export function listRentableUnits() {
  return callCloudFunction('rentable-units-list');
}

export function getRentableUnitDetail(payload: Record<string, unknown>) {
  return callCloudFunction('rentable-unit-detail', payload);
}

export function stringifyUnitListQuery(query: UnitListDrilldownQuery) {
  return Object.entries(normalizeQuery(query))
    .filter(([, value]) => typeof value === 'string' && value)
    .map(([key, value]) => `${key}=${encodeURIComponent(value as string)}`)
    .join('&');
}

export function parseUnitListQueryString(queryString = ''): UnitListDrilldownQuery {
  const trimmed = String(queryString || '').trim().replace(/^\?/, '');
  if (!trimmed) {
    return normalizeQuery();
  }

  const segments = trimmed.split('&').filter(Boolean);
  const nextQuery: Record<string, string> = {};

  segments.forEach((segment) => {
    const [rawKey, rawValue = ''] = segment.split('=');
    const key = decodeURIComponent(rawKey || '');
    if (!key) {
      return;
    }

    nextQuery[key] = decodeURIComponent(rawValue || '');
  });

  return normalizeQuery(nextQuery);
}

export function parseUnitListUrl(url = ''): UnitListDrilldownQuery {
  const [, queryString = ''] = String(url || '').split('?');
  return parseUnitListQueryString(queryString);
}

export function setPendingUnitListDrilldownQuery(query: UnitListDrilldownQuery) {
  const normalized = normalizeQuery(query);

  if (!hasDrilldownFilters(normalized)) {
    removeStorage(UNIT_LIST_DRILLDOWN_STORAGE_KEY);
    return;
  }

  setStorage(UNIT_LIST_DRILLDOWN_STORAGE_KEY, normalized);
}

export function consumePendingUnitListDrilldownQuery(): UnitListDrilldownQuery | null {
  const cached = getStorage<UnitListDrilldownQuery>(UNIT_LIST_DRILLDOWN_STORAGE_KEY);
  removeStorage(UNIT_LIST_DRILLDOWN_STORAGE_KEY);

  if (!cached) {
    return null;
  }

  const normalized = normalizeQuery(cached);
  return hasDrilldownFilters(normalized) ? normalized : null;
}
