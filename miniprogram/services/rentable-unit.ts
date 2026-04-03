import { callCloudFunction } from './cloud';

export type UnitListDrilldownQuery = {
  alertType?: string;
  mainStatus?: string;
  bucket?: string;
  roomId?: string;
};

export function listRentableUnits() {
  return callCloudFunction('rentable-units-list');
}

export function getRentableUnitDetail(payload: Record<string, unknown>) {
  return callCloudFunction('rentable-unit-detail', payload);
}

export function stringifyUnitListQuery(query: UnitListDrilldownQuery) {
  return Object.entries(query)
    .filter(([, value]) => typeof value === 'string' && value)
    .map(([key, value]) => `${key}=${encodeURIComponent(value as string)}`)
    .join('&');
}
