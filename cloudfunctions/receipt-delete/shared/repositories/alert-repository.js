"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listAlerts = listAlerts;
exports.rebuildAlerts = rebuildAlerts;
const alert_evaluator_1 = require("../calculators/alert-evaluator");
const collections_1 = require("../constants/collections");
const runtime_1 = require("../runtime");
async function listAlerts(db, landlordOpenId) {
    const alerts = await (0, runtime_1.listAll)(db, collections_1.COLLECTIONS.alerts);
    return landlordOpenId ? alerts.filter((item) => item.landlordOpenId === landlordOpenId) : alerts;
}
async function rebuildAlerts(db, input) {
    const alerts = (0, alert_evaluator_1.evaluateAlerts)(input);
    const landlordOpenIds = new Set();
    input.rooms.forEach((room) => {
        if (room.landlordOpenId) {
            landlordOpenIds.add(room.landlordOpenId);
        }
    });
    alerts.forEach((alert) => {
        if (alert.landlordOpenId) {
            landlordOpenIds.add(alert.landlordOpenId);
        }
    });
    for (const landlordOpenId of landlordOpenIds) {
        await (0, runtime_1.removeRecordsByQuery)(db, collections_1.COLLECTIONS.alerts, { landlordOpenId });
    }
    for (const alert of alerts) {
        await (0, runtime_1.insertRecord)(db, collections_1.COLLECTIONS.alerts, alert);
    }
    return alerts;
}
