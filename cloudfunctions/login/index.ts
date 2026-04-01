import { COLLECTIONS } from '../shared/constants/collections';

interface DbRecord {
  id: string;
  [key: string]: unknown;
}

interface DbCollection {
  where(query: Record<string, unknown>): {
    get(): Promise<{ data: DbRecord[] }>;
    update(args: { data: Partial<DbRecord> }): Promise<unknown>;
  };
  add(args: { data: DbRecord }): Promise<unknown>;
}

interface DbLike {
  collection(name: string): DbCollection;
}

interface ContextLike {
  getWXContext?: () => {
    OPENID?: string;
  };
}

export interface LoginSession {
  openid: string;
  displayName: string;
  role: 'landlord';
  lastLoginAt: string;
}

export interface LoginEvent {
  displayName?: string;
  __mockDb?: DbLike;
  __mockContext?: ContextLike;
}

function resolveDb(event: LoginEvent): DbLike {
  if (event.__mockDb) {
    return event.__mockDb;
  }

  throw new Error('Cloud database adapter is not available in the current runtime.');
}

function resolveOpenId(event: LoginEvent): string {
  const openid = event.__mockContext?.getWXContext?.().OPENID;

  if (!openid) {
    throw new Error('Missing OPENID from cloud context.');
  }

  return openid;
}

export async function main(event: LoginEvent): Promise<{ session: LoginSession }> {
  const db = resolveDb(event);
  const openid = resolveOpenId(event);
  const displayName = event.displayName?.trim() || '房东';
  const now = new Date().toISOString();
  const session: LoginSession = {
    openid,
    displayName,
    role: 'landlord',
    lastLoginAt: now
  };

  const collection = db.collection(COLLECTIONS.landlordUsers);
  const existing = await collection.where({ openid }).get();

  if (existing.data.length > 0) {
    await collection.where({ openid }).update({
      data: {
        displayName,
        lastLoginAt: now,
        role: 'landlord'
      }
    });
  } else {
    await collection.add({
      data: {
        id: `landlord_${openid}`,
        ...session
      }
    });
  }

  return {
    session
  };
}
