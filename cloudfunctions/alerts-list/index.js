"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.main = main;
const statuses_1 = require("./shared/constants/statuses");
const alert_repository_1 = require("./shared/repositories/alert-repository");
const abnormal_flag_repository_1 = require("./shared/repositories/abnormal-flag-repository");
const bill_repository_1 = require("./shared/repositories/bill-repository");
const lease_lifecycle_1 = require("./shared/calculators/lease-lifecycle");
const statuses_2 = require("./shared/constants/statuses");
const runtime_1 = require("./shared/runtime");
async function main(event) {
    const db = (0, runtime_1.resolveDb)(event);
    const now = event.now ?? new Date().toISOString();
    const { assets, rooms, tenants, leases, bills, repairs } = await (0, runtime_1.getAllDomainData)(db);
    const ensuredBills = [...bills];
    for (const lease of leases) {
        if ((0, lease_lifecycle_1.deriveLeaseStatus)(lease, now) !== statuses_2.LEASE_STATUSES.active) {
            continue;
        }
        if (ensuredBills.some((bill) => bill.leaseId === lease.id)) {
            continue;
        }
        ensuredBills.push(...(await (0, bill_repository_1.ensureBillsForLease)(db, lease, { ...event, now })));
    }
    await (0, abnormal_flag_repository_1.syncRepairFrequencyAbnormalFlags)(db, {
        rooms,
        leases,
        repairs,
        now
    }, { ...event, now });
    const abnormalFlags = await (0, abnormal_flag_repository_1.listAbnormalFlags)(db);
    const alerts = await (0, alert_repository_1.rebuildAlerts)(db, {
        assets,
        rooms,
        leases,
        tenants,
        bills: ensuredBills,
        abnormalFlags,
        now
    });
    const groupsMap = new Map();
    alerts.forEach((alert) => {
        if (!groupsMap.has(alert.type)) {
            groupsMap.set(alert.type, {
                type: alert.type,
                label: statuses_1.ALERT_TYPE_LABELS[alert.type],
                items: []
            });
        }
        groupsMap.get(alert.type)?.items.push(alert);
    });
    return {
        groups: Array.from(groupsMap.values())
    };
}
