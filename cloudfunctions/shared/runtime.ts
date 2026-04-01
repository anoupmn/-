import { COLLECTIONS } from './constants/collections';
import type { Asset } from './schemas/asset';
import type { Lease } from './schemas/lease';
import type { Room } from './schemas/room';
import type { Tenant } from './schemas/tenant';

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

export function resolveDb(event: CloudEventBase): DbLike {
  if (event.__mockDb) {
    return event.__mockDb;
  }

  if (fallbackDb) {
    return fallbackDb;
  }

  throw new Error('Cloud database adapter is not available in the current runtime.');
}

export function resolveLandlordOpenId(event: CloudEventBase) {
  const openid = event.__mockContext?.getWXContext?.().OPENID;

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
  const result = await db.collection(collectionName).get();
  return result.data as T[];
}

export async function findById<T extends DbRecord>(db: DbLike, collectionName: string, id: string) {
  const result = await db.collection(collectionName).doc(id).get();
  return result.data as T | null;
}

export async function insertRecord<T extends DbRecord>(db: DbLike, collectionName: string, record: T) {
  await db.collection(collectionName).add({ data: record });
  return record;
}

export async function updateRecord<T extends DbRecord>(
  db: DbLike,
  collectionName: string,
  id: string,
  changes: Partial<T>
) {
  await db.collection(collectionName).doc(id).update({ data: changes as Partial<DbRecord> });
  const updated = await findById<T>(db, collectionName, id);
  if (!updated) {
    throw new Error(`Record ${id} was not found after update.`);
  }
  return updated;
}

export async function getAllDomainData(db: DbLike) {
  const [assets, rooms, tenants, leases] = await Promise.all([
    listAll<Asset>(db, COLLECTIONS.assets),
    listAll<Room>(db, COLLECTIONS.rooms),
    listAll<Tenant>(db, COLLECTIONS.tenants),
    listAll<Lease>(db, COLLECTIONS.leases)
  ]);

  return {
    assets,
    rooms,
    tenants,
    leases
  };
}
