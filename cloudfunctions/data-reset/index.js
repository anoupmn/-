const cloudSdk = (() => {
  try {
    return require('wx-server-sdk');
  } catch {
    return null;
  }
})();

const REQUIRED_TOKEN_CURRENT = 'RESET_MY_TEST_DATA';
const REQUIRED_TOKEN_ALL = 'RESET_ALL_TEST_DATA';

const TARGETS = [
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

function resolveDb(event) {
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

function resolveOpenId(event) {
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

async function countRows(db, collectionName, ownerKey, openid) {
  const result = await db.collection(collectionName).where({ [ownerKey]: openid }).get();
  return Array.isArray(result.data) ? result.data.length : 0;
}

async function removeRows(db, collectionName, ownerKey, openid) {
  const result = await db.collection(collectionName).where({ [ownerKey]: openid }).remove();
  return Number(result.stats?.removed ?? 0);
}

async function listAllRows(db, collectionName) {
  const collection = db.collection(collectionName);
  if (typeof collection.skip === 'function' && typeof collection.limit === 'function') {
    const pageSize = 100;
    const rows = [];
    let offset = 0;

    while (true) {
      const result = await collection.skip(offset).limit(pageSize).get();
      const page = Array.isArray(result.data) ? result.data : [];
      rows.push(...page);

      if (page.length < pageSize) {
        break;
      }

      offset += pageSize;
    }

    return rows;
  }

  const result = await collection.get();
  return Array.isArray(result.data) ? result.data : [];
}

async function removeAllRows(db, collectionName) {
  if (db.command?.exists) {
    const result = await db.collection(collectionName).where({ id: db.command.exists(true) }).remove();
    return Number(result.stats?.removed ?? 0);
  }

  const rows = await listAllRows(db, collectionName);
  let removed = 0;

  for (const row of rows) {
    const id = String(row?.id ?? '').trim();
    if (!id) {
      continue;
    }

    const result = await db.collection(collectionName).where({ id }).remove();
    removed += Number(result.stats?.removed ?? 0);
  }

  return removed;
}

async function main(event) {
  const scope = event.scope === 'all' ? 'all' : 'current';
  const requiredToken = scope === 'all' ? REQUIRED_TOKEN_ALL : REQUIRED_TOKEN_CURRENT;
  if (event.confirmToken !== requiredToken) {
    throw new Error(`Invalid confirmToken. Pass ${requiredToken} to execute ${scope} reset.`);
  }

  const db = resolveDb(event);
  const operatorOpenid = resolveOpenId(event);
  const dryRun = event.dryRun === true;

  const targets = event.includeLandlordUser
    ? [...TARGETS, { collection: 'landlord_users', ownerKey: 'openid' }]
    : TARGETS;

  const details = [];

  for (const target of targets) {
    const counted = scope === 'all'
      ? (await listAllRows(db, target.collection)).length
      : await countRows(db, target.collection, target.ownerKey, operatorOpenid);
    const removed = dryRun || counted === 0
      ? 0
      : scope === 'all'
        ? await removeAllRows(db, target.collection)
        : await removeRows(db, target.collection, target.ownerKey, operatorOpenid);

    details.push({
      collection: target.collection,
      counted,
      removed
    });
  }

  return {
    ok: true,
    scope,
    operatorOpenid,
    dryRun,
    totalCounted: details.reduce((sum, item) => sum + item.counted, 0),
    totalRemoved: details.reduce((sum, item) => sum + item.removed, 0),
    details
  };
}

module.exports = {
  main
};
