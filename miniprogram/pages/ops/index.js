"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const auth_1 = require("../../services/auth");
const rentable_unit_1 = require("../../services/rentable-unit");
Page({
    data: {
        displayName: ''
    },
    async onShow() {
        const session = await (0, auth_1.requireAuthSession)();
        if (!session) {
            return;
        }
        this.setData({
            displayName: session.displayName
        });
    },
    navigateTo(event) {
        const url = event.currentTarget.dataset.url;
        if (!url) {
            return;
        }
        wx.navigateTo({
            url
        });
    },
    openUnitsTab() {
        wx.switchTab({
            url: '/pages/units/index'
        });
    },
    openLeaseList() {
        (0, rentable_unit_1.setPendingUnitListDrilldownQuery)({
            mainStatus: 'occupied'
        });
        wx.switchTab({
            url: '/pages/units/index'
        });
    }
});
