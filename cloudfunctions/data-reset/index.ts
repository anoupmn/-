interface ContextLike {
  getWXContext?: () => {
    OPENID?: string;
  };
  database?: () => DbLike;
}

interface DbCollection {
  where(query: Record<string, unknown>): {
    get(): Promise<{ data: Array<Record<string, unknown>> }>;
    remove(): Promise<{ stats?: { removed?: number } }>;
  };
}

interface DbLike {
  collection(name: string): DbCollection;
}

const cloudSdk = (() => {
  try {
    return require('wx-server-sdk');
  } catch {
    return null;
  }
})();

export interface DataResetEvent {
  confirmToken?: string;
  includeLandlordUser?: boolean;
  dryRun?: boolean;
  __mockContext?: ContextLike;
  __mockDb?: DbLike;
}

const REQUIRED_TOKEN = 'RESET_MY_TEST_DATA';

const TARGETS: Array<{ collection: string; ownerKey: 'landlordOpenId' | 'openid' }> = [
  { collection: 'assets', ownerKey: 'landlordOpenId' },
  { collection: 'rooms', ownerKey: 'landlordOpenId' },
  { collection: 'tenants', ownerKey: 'landlordOpenId' },
  { collection: 'leases', ownerKey: 'landlordOpenId' },
  { collection: 'bills', ownerKey: 'landlordOpenId' },
  { collection: 'repair_records', ownerKey: 'landlordOpenId' },
  { collection: 'abnormal_flags', ownerKey: 'landlordOpenId' },
  { collection: 'notification_preferences', ownerKey: 'landlordOpenId' },
  { collection: 'alerts', ownerKey: 'landlordOpenId' }
];

function resolveDb(event: DataResetEvent): DbLike {
  if (event.__mockDb) {
    return event.__mockDb;
  }

  const contextDb = event.__mockContext?.database?.();
  if (contextDb) {
    return contextDb;
  }

  if (!cloudSdk) {
    throw new Error('wx-server-sdk is unavailable.');
  }

  cloudSdk.init({ env: cloudSdk.DYNAMIC_CURRENT_ENV });
  return cloudSdk.database();
}

function resolveOpenId(event: DataResetEvent): string {
  const openid =
    event.__mockContext?.getWXContext?.().OPENID ??
    (() => {
      try {
        if (!cloudSdk) {
          return undefined;
        }

        cloudSdk.init({ env: cloudSdk.DYNAMIC_CURRENT_ENV });
        return cloudSdk.getWXContext?.().OPENID;
      } catch {
        return undefined;
      }
    })();

  if (!openid) {
    throw new Error('Missing OPENID from cloud context.');
  }

  return openid;
}

async function countRows(db: DbLike, collectionName: string, ownerKey: string, openid: string) {
  const result = await db.collection(collectionName).where({ [ownerKey]: openid }).get();
  return Array.isArray(result.data) ? result.data.length : 0;
}

async function removeRows(db: DbLike, collectionName: string, ownerKey: string, openid: string) {
  const result = await db.collection(collectionName).where({ [ownerKey]: openid }).remove();
  return Number(result.stats?.removed ?? 0);
}

export async function main(event: DataResetEvent) {
  if (event.confirmToken !== REQUIRED_TOKEN) {
    throw new Error('Invalid confirmToken. Pass RESET_MY_TEST_DATA to execute reset.');
  }

  const db = resolveDb(event);
  const openid = resolveOpenId(event);
  const dryRun = event.dryRun === true;

  const targets = event.includeLandlordUser
    ? [...TARGETS, { collection: 'landlord_users', ownerKey: 'openid' as const }]
    : TARGETS;

  const details: Array<{
    collection: string;
    counted: number;
    removed: number;
  }> = [];

  for (const target of targets) {
    const counted = await countRows(db, target.collection, target.ownerKey, openid);
    const removed = dryRun || counted === 0
      ? 0
      : await removeRows(db, target.collection, target.ownerKey, openid);

    details.push({
      collection: target.collection,
      counted,
      removed
    });
  }

  return {
    ok: true,
    openid,
    dryRun,
    totalCounted: details.reduce((sum, item) => sum + item.counted, 0),
    totalRemoved: details.reduce((sum, item) => sum + item.removed, 0),
    details
  };
}
