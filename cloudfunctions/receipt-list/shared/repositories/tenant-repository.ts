import { COLLECTIONS } from '../constants/collections';
import { tenantSchema, type Tenant, type TenantInput } from '../schemas/tenant';
import { createId, insertRecord, listAll, resolveNow, type CloudEventBase, type DbLike, updateRecord } from '../runtime';

export async function createTenant(db: DbLike, landlordOpenId: string, input: TenantInput, event: CloudEventBase) {
  const tenant = tenantSchema.parse({
    id: createId('tenant'),
    landlordOpenId,
    ...input,
    createdAt: resolveNow(event),
    updatedAt: resolveNow(event)
  });

  await insertRecord(db, COLLECTIONS.tenants, tenant);
  return tenant;
}

export async function updateTenant(db: DbLike, tenantId: string, changes: Partial<TenantInput>, event: CloudEventBase) {
  return updateRecord<Tenant>(db, COLLECTIONS.tenants, tenantId, {
    ...changes,
    updatedAt: resolveNow(event)
  });
}

export async function listTenants(db: DbLike) {
  return listAll<Tenant>(db, COLLECTIONS.tenants);
}
