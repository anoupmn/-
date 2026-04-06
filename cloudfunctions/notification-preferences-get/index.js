"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.main = main;
const collections_1 = require("../shared/constants/collections");
const notification_preference_repository_1 = require("../shared/repositories/notification-preference-repository");
const runtime_1 = require("../shared/runtime");
async function main(event) {
    const db = (0, runtime_1.resolveDb)(event);
    const landlordOpenId = (0, runtime_1.resolveLandlordOpenId)(event);
    const preference = await (0, notification_preference_repository_1.getNotificationPreference)(db, landlordOpenId);
    return {
        collectionName: collections_1.COLLECTIONS.notificationPreferences,
        preference
    };
}
