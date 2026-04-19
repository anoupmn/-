"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.main = main;
const dashboard_1 = require("./shared/calculators/dashboard");
const rentable_unit_1 = require("./shared/calculators/rentable-unit");
const lease_lifecycle_1 = require("./shared/calculators/lease-lifecycle");
const statuses_1 = require("./shared/constants/statuses");
const alert_repository_1 = require("./shared/repositories/alert-repository");
const abnormal_flag_repository_1 = require("./shared/repositories/abnormal-flag-repository");
const notification_preference_repository_1 = require("./shared/repositories/notification-preference-repository");
const runtime_1 = require("./shared/runtime");
async function main(event) {
    const db = (0, runtime_1.resolveDb)(event);
    const landlordOpenId = (0, runtime_1.resolveLandlordOpenId)(event);
    const now = event.now ?? new Date().toISOString();
    const { assets, rooms, tenants, leases, bills, repairs } = await (0, runtime_1.getAllDomainData)(db, landlordOpenId);
    const activeLeases = leases.filter((lease) => (0, lease_lifecycle_1.deriveLeaseStatus)(lease, now) === statuses_1.LEASE_STATUSES.active);
    const activeLeaseIdSet = new Set(activeLeases.map((lease) => lease.id));
    const activeBills = bills.filter((bill) => activeLeaseIdSet.has(bill.leaseId));
    await (0, abnormal_flag_repository_1.syncRepairFrequencyAbnormalFlags)(db, {
        rooms,
        leases,
        repairs,
        now
    }, { ...event, now });
    const abnormalFlags = await (0, abnormal_flag_repository_1.listAbnormalFlags)(db, landlordOpenId);
    const alerts = await (0, alert_repository_1.rebuildAlerts)(db, {
        assets,
        rooms,
        leases,
        tenants,
        bills: activeBills,
        abnormalFlags,
        now
    });
    const units = rooms
        .map((room) => {
        const asset = assets.find((item) => item.id === room.assetId);
        if (!asset) {
            return null;
        }
            return (0, rentable_unit_1.buildRentableUnitSummary)({
                asset,
                room,
                leases,
                tenants,
                bills: activeBills,
                now
            });
    })
        .filter((item) => Boolean(item));
    const preference = await (0, notification_preference_repository_1.getNotificationPreference)(db, landlordOpenId);
    return (0, dashboard_1.buildDashboardPayload)({
        alerts: alerts.filter((item) => item.landlordOpenId === landlordOpenId),
        units,
        subscriptionState: {
            consentState: preference.consentState,
            hasRequested: preference.hasRequested,
            enabledRuleTypes: preference.enabledRuleTypes
        }
    });
}
