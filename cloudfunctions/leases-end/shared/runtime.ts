import { COLLECTIONS } from './constants/collections';
import type { Asset } from './schemas/asset';
import type { Bill } from './schemas/bill';
import type { Lease } from './schemas/lease';
import type { RepairRecord } from './schemas/repair-record';
import type { Room } from './schemas/room';
import type { Tenant } from './schemas/tenant';

const cloudSdk = (() => {
  try {
    return require('wx-server-sdk');
  } catch {
    return null;
  }
})();
let cloudSdkReady = false;

export interface DbRecord {
  id: string;
  [key: string]: unknown;
}

export interface DbCollection {
  get(): Promise<{ data: DbRecord[] }>;
  add(args: { data: DbRecord }): Promise<{ _id: string }>;
  where(query: Record<string, unknown>): {
    get(): Promise<{ data: DbRecord[] }>;
    update(args: { data: Partial<DbRecord> }): Promise<unknown>;
    remove(): Promise<unknown>;
  };
  doc(id: string): {
    get(): Promise<{ data: DbRecord | null }>;
    update(args: { data: Partial<DbRecord> }): Promise<unknown>;
    remove(): Promise<unknown>;
  };
}

export interface DbLike {
  collection(name: string): DbCollection;
  createCollection?: (name: string) => Promise<unknown>;
}

export interface CloudContextLike {
  getWXContext?: () => {
    OPENID?: string;
  };
}

export interface CloudEventBase {
  __mockDb?: DbLike;
  __mockContext?: CloudContextLike;
  now?: string;
}

let fallbackDb: DbLike | null = null;

export function setFallbackDb(db: DbLike | null) {
  fallbackDb = db;
}

function resolveCloudDb(): DbLike | null {
  if (!cloudSdk) {
    return null;
  }

  try {
    if (!cloudSdkReady) {
      cloudSdk.init({ env: cloudSdk.DYNAMIC_CURRENT_ENV });
      cloudSdkReady = true;
    }
    return cloudSdk.database() as DbLike;
  } catch {
    return null;
  }
}

function isCollectionMissingError(error: unknown) {
  const payload = error as { errCode?: number; message?: string } | undefined;
  const message = payload?.message ?? '';
  return payload?.errCode === -502005 || message.includes('collection not exists') || message.includes('Db or Table not exist');
}

function isDocumentNotFoundError(error: unknown) {
  const payload = error as { errCode?: number; message?: string } | undefined;
  const message = payload?.message ?? '';
  return payload?.errCode === -504002 || message.includes('document.get:fail document with _id');
}

function isCollectionAlreadyExistsError(error: unknown) {
  const payload = error as { message?: string } | undefined;
  const message = payload?.message ?? '';
  return message.includes('already exists');
}

export async function ensureCollectionExists(db: DbLike, collectionName: string) {
  if (typeof db.createCollection !== 'function') {
    return;
  }

  try {
    await db.createCollection(collectionName);
  } catch (error) {
    if (!isCollectionAlreadyExistsError(error)) {
      throw error;
    }
  }
}

export function resolveDb(event: CloudEventBase): DbLike {
  if (event.__mockDb) {
    return event.__mockDb;
  }

  if (fallbackDb) {
    return fallbackDb;
  }

  const cloudDb = resolveCloudDb();
  if (cloudDb) {
    return cloudDb;
  }

  throw new Error('Cloud database adapter is not available in the current runtime.');
}

export function resolveLandlordOpenId(event: CloudEventBase) {
  const openid =
    event.__mockContext?.getWXContext?.().OPENID ??
    (() => {
      try {
        return cloudSdk?.getWXContext?.().OPENID;
      } catch {
        return undefined;
      }
    })();

  if (!openid) {
    throw new Error('Missing OPENID from cloud context.');
  }

  return openid;
}

export function resolveNow(event: CloudEventBase) {
  return event.now ?? new Date().toISOString();
}

export function createId(prefix: string) {
  const random = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${random}`;
}

export async function listAll<T extends DbRecord>(db: DbLike, collectionName: string) {
  try {
    const result = await db.collection(collectionName).get();
    return result.data as T[];
  } catch (error) {
    if (!isCollectionMissingError(error)) {
      throw error;
    }

    await ensureCollectionExists(db, collectionName);
    return [];
  }
}

export async function findById<T extends DbRecord>(db: DbLike, collectionName: string, id: string) {
  try {
    const result = await db.collection(collectionName).doc(id).get();
    if (result.data) {
      return result.data as T;
    }
  } catch (error) {
    if (!isDocumentNotFoundError(error)) {
      throw error;
    }
  }

  const byBusinessId = await db.collection(collectionName).where({ id }).get();
  const firstMatch = (byBusinessId.data || [])[0] as T | undefined;
  return firstMatch ?? null;
}

export async function insertRecord<T extends DbRecord>(db: DbLike, collectionName: string, record: T) {
  try {
    await db.collection(collectionName).add({ data: record });
  } catch (error) {
    if (!isCollectionMissingError(error)) {
      throw error;
    }

    await ensureCollectionExists(db, collectionName);
    await db.collection(collectionName).add({ data: record });
  }
  return record;
}

export async function clearCollection(db: DbLike, collectionName: string) {
  try {
    const dbWithCommand = db as DbLike & {
      command?: {
        exists?: (value: boolean) => unknown;
      };
    };

    if (dbWithCommand.command?.exists) {
      await db.collection(collectionName).where({ id: dbWithCommand.command.exists(true) as never }).remove();
      return;
    }

    const snapshot = await db.collection(collectionName).get();
    if (!Array.isArray(snapshot.data) || snapshot.data.length === 0) {
      return;
    }

    for (const item of snapshot.data) {
      if (!item?.id) {
        continue;
      }
      await db.collection(collectionName).where({ id: item.id }).remove();
    }
  } catch (error) {
    if (!isCollectionMissingError(error)) {
      throw error;
    }

    await ensureCollectionExists(db, collectionName);
  }
}

export async function updateRecord<T extends DbRecord>(
  db: DbLike,
  collectionName: string,
  id: string,
  changes: Partial<T>
) {
  try {
    await db.collection(collectionName).doc(id).update({ data: changes as Partial<DbRecord> });
  } catch (error) {
    if (!isDocumentNotFoundError(error)) {
      throw error;
    }

    const byBusinessId = await db.collection(collectionName).where({ id }).get();
    const target = (byBusinessId.data || [])[0] as (DbRecord & { _id?: string }) | undefined;
    if (!target?._id) {
      throw new Error(`Record ${id} was not found by _id or business id.`);
    }

    await db.collection(collectionName).doc(target._id).update({ data: changes as Partial<DbRecord> });
  }

  const updated = await findById<T>(db, collectionName, id);
  if (!updated) {
    throw new Error(`Record ${id} was not found after update.`);
  }
  return updated;
}

export async function getAllDomainData(db: DbLike) {
  const [assets, rooms, tenants, leases, bills, repairs] = await Promise.all([
    listAll<Asset>(db, COLLECTIONS.assets),
    listAll<Room>(db, COLLECTIONS.rooms),
    listAll<Tenant>(db, COLLECTIONS.tenants),
    listAll<Lease>(db, COLLECTIONS.leases),
    listAll<Bill>(db, COLLECTIONS.bills),
    listAll<RepairRecord>(db, COLLECTIONS.repairRecords)
  ]);

  return {
    assets,
    rooms,
    tenants,
    leases,
    bills,
    repairs
  };
}
