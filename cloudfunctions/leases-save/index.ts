import { createLease, updateLease } from './shared/repositories/lease-repository';
import { createTenant } from './shared/repositories/tenant-repository';
import { COLLECTIONS } from './shared/constants/collections';
import { listAll, resolveDb, resolveLandlordOpenId, type CloudEventBase } from './shared/runtime';
import type { LeaseInput } from './shared/schemas/lease';
import type { TenantInput } from './shared/schemas/tenant';

export interface LeaseSaveEvent extends CloudEventBase {
  leaseId?: string;
  lease: Omit<LeaseInput, 'tenantId'> & {
    tenantId?: string;
  };
  tenant?: TenantInput;
}

export async function main(event: LeaseSaveEvent) {
  const db = resolveDb(event);
  const landlordOpenId = resolveLandlordOpenId(event);

  const [rooms, tenants] = await Promise.all([
    listAll<{ id: string; landlordOpenId: string }>(db, COLLECTIONS.rooms),
    listAll<{ id: string; landlordOpenId: string }>(db, COLLECTIONS.tenants)
  ]);
  const ownedRoom = rooms.find((item) => item.id === event.lease.roomId && item.landlordOpenId === landlordOpenId);
  if (!ownedRoom) {
    throw new Error(`Room ${event.lease.roomId} not found.`);
  }

  const providedTenantId = String(event.lease.tenantId || '').trim();

  if (event.leaseId) {
    const ownedTenant = tenants.find((item) => item.id === providedTenantId && item.landlordOpenId === landlordOpenId);
    if (!ownedTenant) {
      throw new Error(`Tenant ${providedTenantId} not found.`);
    }

    const leases = await listAll<{ id: string; landlordOpenId: string }>(db, COLLECTIONS.leases);
    const ownedLease = leases.find((item) => item.id === event.leaseId && item.landlordOpenId === landlordOpenId);

    if (!ownedLease) {
      throw new Error(`Lease ${event.leaseId} not found.`);
    }

    return updateLease(db, event.leaseId, {
      ...event.lease,
      tenantId: providedTenantId
    }, event);
  }

  let tenantId = providedTenantId;
  let createdTenantId = '';

  if (tenantId) {
    const ownedTenant = tenants.find((item) => item.id === tenantId && item.landlordOpenId === landlordOpenId);
    if (!ownedTenant) {
      throw new Error(`Tenant ${tenantId} not found.`);
    }
  } else if (event.tenant) {
    const createdTenant = await createTenant(db, landlordOpenId, event.tenant, event);
    tenantId = createdTenant.id;
    createdTenantId = createdTenant.id;
  } else {
    throw new Error('tenantId or tenant is required.');
  }

  try {
    return await createLease(db, landlordOpenId, {
      ...event.lease,
      tenantId
    }, event);
  } catch (error) {
    if (createdTenantId) {
      try {
        await db.collection(COLLECTIONS.tenants).where({ id: createdTenantId, landlordOpenId }).remove();
      } catch (cleanupError) {
        console.warn('rollback created tenant after lease failure failed', cleanupError);
      }
    }

    throw error;
  }
}
