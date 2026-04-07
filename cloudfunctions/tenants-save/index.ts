import { createTenant, updateTenant } from './shared/repositories/tenant-repository';
import { COLLECTIONS } from './shared/constants/collections';
import { listAll, resolveDb, resolveLandlordOpenId, type CloudEventBase } from './shared/runtime';
import type { TenantInput } from './shared/schemas/tenant';

export interface TenantSaveEvent extends CloudEventBase {
  tenantId?: string;
  tenant: TenantInput;
}

export async function main(event: TenantSaveEvent) {
  const db = resolveDb(event);
  const landlordOpenId = resolveLandlordOpenId(event);

  if (event.tenantId) {
    const tenants = await listAll<{ id: string; landlordOpenId: string }>(db, COLLECTIONS.tenants);
    const ownedTenant = tenants.find((item) => item.id === event.tenantId && item.landlordOpenId === landlordOpenId);

    if (!ownedTenant) {
      throw new Error(`Tenant ${event.tenantId} not found.`);
    }

    return updateTenant(db, event.tenantId, event.tenant, event);
  }

  return createTenant(db, landlordOpenId, event.tenant, event);
}
