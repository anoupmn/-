"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setFallbackDb = setFallbackDb;
exports.resolveDb = resolveDb;
exports.resolveLandlordOpenId = resolveLandlordOpenId;
exports.resolveNow = resolveNow;
exports.createId = createId;
exports.listAll = listAll;
exports.findById = findById;
exports.insertRecord = insertRecord;
exports.updateRecord = updateRecord;
exports.getAllDomainData = getAllDomainData;
const collections_1 = require("./constants/collections");
let fallbackDb = null;
function setFallbackDb(db) {
    fallbackDb = db;
}
function resolveDb(event) {
    if (event.__mockDb) {
        return event.__mockDb;
    }
    if (fallbackDb) {
        return fallbackDb;
    }
    throw new Error('Cloud database adapter is not available in the current runtime.');
}
function resolveLandlordOpenId(event) {
    const openid = event.__mockContext?.getWXContext?.().OPENID;
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
    const result = await db.collection(collectionName).get();
    return result.data;
}
async function findById(db, collectionName, id) {
    const result = await db.collection(collectionName).doc(id).get();
    return result.data;
}
async function insertRecord(db, collectionName, record) {
    await db.collection(collectionName).add({ data: record });
    return record;
}
async function updateRecord(db, collectionName, id, changes) {
    await db.collection(collectionName).doc(id).update({ data: changes });
    const updated = await findById(db, collectionName, id);
    if (!updated) {
        throw new Error(`Record ${id} was not found after update.`);
    }
    return updated;
}
async function getAllDomainData(db) {
    const [assets, rooms, tenants, leases, bills] = await Promise.all([
        listAll(db, collections_1.COLLECTIONS.assets),
        listAll(db, collections_1.COLLECTIONS.rooms),
        listAll(db, collections_1.COLLECTIONS.tenants),
        listAll(db, collections_1.COLLECTIONS.leases),
        listAll(db, collections_1.COLLECTIONS.bills)
    ]);
    return {
        assets,
        rooms,
        tenants,
        leases,
        bills
    };
}
