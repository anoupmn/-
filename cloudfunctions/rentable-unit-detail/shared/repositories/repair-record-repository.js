"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listRepairRecords = listRepairRecords;
exports.buildRoomRepairStats = buildRoomRepairStats;
exports.createRepairRecord = createRepairRecord;
const collections_1 = require("../constants/collections");
const repairs_1 = require("../constants/repairs");
const repair_record_1 = require("../schemas/repair-record");
const runtime_1 = require("../runtime");
function getDateKey(raw) {
    return raw.slice(0, 10);
}
function isWithinRange(dateKey, startDate, endDate) {
    return dateKey >= startDate && dateKey <= endDate;
}
function resolveLeaseActualEndDate(lease) {
    const closedDate = lease.closedAt ? lease.closedAt.slice(0, 10) : '';
    if (closedDate && closedDate < lease.endDate) {
        return closedDate;
    }
    return lease.endDate;
}
function findLeaseByDate(leases, occurredAt) {
    return (leases
        .filter((item) => isWithinRange(occurredAt, item.startDate, item.endDate))
        .sort((a, b) => b.startDate.localeCompare(a.startDate))[0] ?? null);
}
function toUtcTime(dateKey) {
    return new Date(`${dateKey}T00:00:00.000Z`).getTime();
}
function normalizeOccurredAt(inputOccurredAt, event) {
    const fallback = getDateKey((0, runtime_1.resolveNow)(event));
    return getDateKey(inputOccurredAt ?? fallback);
}
async function listRepairRecords(db) {
    return (0, runtime_1.listAll)(db, collections_1.COLLECTIONS.repairRecords);
}
function buildRoomRepairStats(input) {
    const { roomId, leases, records, now, topN = 3 } = input;
    const roomRecords = records.filter((item) => item.roomId === roomId);
    const nowMs = toUtcTime(getDateKey(now));
    const recent30dCount = roomRecords.filter((item) => {
        const diffMs = nowMs - toUtcTime(item.occurredAt);
        return diffMs >= 0 && diffMs <= repairs_1.REPAIR_FREQUENCY_WINDOW_DAYS * 24 * 60 * 60 * 1000;
    }).length;
    const categoryMap = roomRecords.reduce((acc, item) => ({
        ...acc,
        [item.category]: (acc[item.category] ?? 0) + 1
    }), {
        plumbing: 0,
        electrical: 0,
        appliance: 0,
        structure: 0,
        safety: 0,
        other: 0
    });
    const topCategories = Object.entries(categoryMap)
        .filter(([, count]) => count > 0)
        .map(([category, count]) => ({
        category: category,
        label: repairs_1.REPAIR_CATEGORY_LABELS[category],
        count
    }))
        .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
        .slice(0, topN);
    const perLeaseCounts = leases
        .filter((item) => item.roomId === roomId)
        .sort((a, b) => a.startDate.localeCompare(b.startDate))
        .map((lease) => {
        const actualEndDate = resolveLeaseActualEndDate(lease);
        return {
            leaseId: lease.id,
            tenantId: lease.tenantId,
            startDate: lease.startDate,
            endDate: actualEndDate,
            count: roomRecords.filter((record) => isWithinRange(record.occurredAt, lease.startDate, actualEndDate)).length
        };
    });
    return {
        roomId,
        totalCount: roomRecords.length,
        recent30dCount,
        topCategories,
        perLeaseCounts,
        abnormal: {
            active: recent30dCount >= repairs_1.REPAIR_FREQUENCY_THRESHOLD,
            reason: `近 ${repairs_1.REPAIR_FREQUENCY_WINDOW_DAYS} 天维修 ${recent30dCount} 次`,
            threshold: repairs_1.REPAIR_FREQUENCY_THRESHOLD,
            windowDays: repairs_1.REPAIR_FREQUENCY_WINDOW_DAYS
        }
    };
}
async function createRepairRecord(db, rawInput, event) {
    const input = repair_record_1.repairRecordInputSchema.parse(rawInput);
    const occurredAt = normalizeOccurredAt(input.occurredAt, event);
    const now = (0, runtime_1.resolveNow)(event);
    const [assets, rooms, leases] = await Promise.all([
        (0, runtime_1.listAll)(db, collections_1.COLLECTIONS.assets),
        (0, runtime_1.listAll)(db, collections_1.COLLECTIONS.rooms),
        (0, runtime_1.listAll)(db, collections_1.COLLECTIONS.leases)
    ]);
    const room = input.roomId ? rooms.find((item) => item.id === input.roomId && item.landlordOpenId === rawInput.landlordOpenId) : null;
    if (input.roomId && !room) {
        throw new Error(`Room ${input.roomId} not found.`);
    }
    const resolvedAssetId = room?.assetId ?? input.assetId;
    if (!resolvedAssetId) {
        throw new Error('assetId or roomId is required.');
    }
    const asset = assets.find((item) => item.id === resolvedAssetId && item.landlordOpenId === rawInput.landlordOpenId);
    if (!asset) {
        throw new Error(`Asset ${resolvedAssetId} not found.`);
    }
    const lease = room
        ? findLeaseByDate(leases.filter((item) => item.roomId === room.id && item.landlordOpenId === rawInput.landlordOpenId), occurredAt)
        : null;
    const record = repair_record_1.repairRecordSchema.parse({
        id: (0, runtime_1.createId)('repair'),
        landlordOpenId: rawInput.landlordOpenId,
        assetId: resolvedAssetId,
        roomId: room?.id ?? null,
        leaseId: lease?.id ?? null,
        tenantId: lease?.tenantId ?? null,
        category: input.category,
        note: input.note.trim(),
        occurredAt,
        createdAt: now,
        updatedAt: now
    });
    await (0, runtime_1.insertRecord)(db, collections_1.COLLECTIONS.repairRecords, record);
    return record;
}
