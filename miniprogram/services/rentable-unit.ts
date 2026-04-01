import { callCloudFunction } from './cloud';

export function listRentableUnits() {
  return callCloudFunction('rentable-units-list');
}

export function getRentableUnitDetail(payload: Record<string, unknown>) {
  return callCloudFunction('rentable-unit-detail', payload);
}
