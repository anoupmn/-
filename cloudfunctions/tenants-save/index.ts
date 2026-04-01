import { createTenant, updateTenant } from '../shared/repositories/tenant-repository';
import { resolveDb, resolveLandlordOpenId, type CloudEventBase } from '../shared/runtime';
import type { TenantInput } from '../shared/schemas/tenant';

export interface TenantSaveEvent extends CloudEventBase {
  tenantId?: string;
  tenant: TenantInput;
}

export async function main(event: TenantSaveEvent) {
  const db = resolveDb(event);

  if (event.tenantId) {
    return updateTenant(db, event.tenantId, event.tenant, event);
  }

  return createTenant(db, resolveLandlordOpenId(event), event.tenant, event);
}
