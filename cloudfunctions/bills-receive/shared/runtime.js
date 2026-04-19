"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setFallbackDb = setFallbackDb;
exports.ensureCollectionExists = ensureCollectionExists;
exports.resolveDb = resolveDb;
exports.resolveLandlordOpenId = resolveLandlordOpenId;
exports.resolveNow = resolveNow;
exports.createId = createId;
exports.listAll = listAll;
exports.findById = findById;
exports.insertRecord = insertRecord;
exports.clearCollection = clearCollection;
exports.updateRecord = updateRecord;
exports.getAllDomainData = getAllDomainData;
const collections_1 = require("./constants/collections");
const cloudSdk = (() => {
    try {
        return require("wx-server-sdk");
    }
    catch {
        return null;
    }
})();
let cloudSdkReady = false;
let fallbackDb = null;
function setFallbackDb(db) {
    fallbackDb = db;
}
function resolveCloudDb() {
    if (!cloudSdk) {
        return null;
    }
    try {
        if (!cloudSdkReady) {
            cloudSdk.init({ env: cloudSdk.DYNAMIC_CURRENT_ENV });
            cloudSdkReady = true;
        }
        return cloudSdk.database();
    }
    catch {
        return null;
    }
}
function isCollectionMissingError(error) {
    const payload = error;
    const message = payload?.message ?? '';
    return payload?.errCode === -502005 || message.includes('collection not exists') || message.includes('Db or Table not exist');
}
function isCollectionAlreadyExistsError(error) {
    const payload = error;
    const message = payload?.message ?? '';
    return message.includes('already exists');
}
async function ensureCollectionExists(db, collectionName) {
    if (typeof db.createCollection !== 'function') {
        return;
    }
    try {
        await db.createCollection(collectionName);
    }
    catch (error) {
        if (!isCollectionAlreadyExistsError(error)) {
            throw error;
        }
    }
}
function resolveDb(event) {
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
function resolveLandlordOpenId(event) {
    const openid = event.__mockContext?.getWXContext?.().OPENID ??
        (() => {
            try {
                return cloudSdk?.getWXContext?.().OPENID;
            }
            catch {
                return undefined;
            }
        })();
    if (!openid) {
        throw new Error('Missing OPENID from cloud context.');
    }
    return openid;
}
function resolveNow(event) {
    return event.now ?? new Date().toISOString();
}
function createId(prefix) {
    const random = Math.random().toString(36).slice(2, 10);
    return `${prefix}_${random}`;
}
async function listAll(db, collectionName) {
    try {
        const collection = db.collection(collectionName);
        const supportsPagination = typeof collection.skip === "function" && typeof collection.limit === "function";
        if (!supportsPagination) {
            const result = await collection.get();
            return result.data;
        }
        const pageSize = 100;
        const rows = [];
        let offset = 0;
        while (true) {
            const result = await collection.skip(offset).limit(pageSize).get();
            const page = result.data ?? [];
            rows.push(...page);
            if (page.length < pageSize) {
                break;
            }
            offset += pageSize;
        }
        return rows;
    }
    catch (error) {
        if (!isCollectionMissingError(error)) {
            throw error;
        }
        await ensureCollectionExists(db, collectionName);
        return [];
    }
}
async function findById(db, collectionName, id) {
    const result = await db.collection(collectionName).where({ id }).get();
    if (!Array.isArray(result.data) || result.data.length === 0) {
        return null;
    }
    return result.data[0];
}
async function insertRecord(db, collectionName, record) {
    try {
        await db.collection(collectionName).add({ data: record });
    }
    catch (error) {
        if (!isCollectionMissingError(error)) {
            throw error;
        }
        await ensureCollectionExists(db, collectionName);
        await db.collection(collectionName).add({ data: record });
    }
    return record;
}
async function clearCollection(db, collectionName) {
    try {
        const dbWithCommand = db;
        if (dbWithCommand.command?.exists) {
            await db.collection(collectionName).where({ id: dbWithCommand.command.exists(true) }).remove();
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
    }
    catch (error) {
        if (!isCollectionMissingError(error)) {
            throw error;
        }
        await ensureCollectionExists(db, collectionName);
    }
}
async function updateRecord(db, collectionName, id, changes) {
    await db.collection(collectionName).where({ id }).update({ data: changes });
    const updated = await findById(db, collectionName, id);
    if (!updated) {
        throw new Error(`Record ${id} was not found after update.`);
    }
    return updated;
}
async function getAllDomainData(db) {
    const [assets, rooms, tenants, leases, bills, repairs] = await Promise.all([
        listAll(db, collections_1.COLLECTIONS.assets),
        listAll(db, collections_1.COLLECTIONS.rooms),
        listAll(db, collections_1.COLLECTIONS.tenants),
        listAll(db, collections_1.COLLECTIONS.leases),
        listAll(db, collections_1.COLLECTIONS.bills),
        listAll(db, collections_1.COLLECTIONS.repairRecords)
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
