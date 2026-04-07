"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.main = main;
const cloudSdk = (() => {
    try {
        return require('wx-server-sdk');
    }
    catch {
        return null;
    }
})();
function resolveOpenId(event) {
    const openid = event.__mockContext?.getWXContext?.().OPENID ??
        (() => {
            try {
                if (!cloudSdk) {
                    return undefined;
                }
                cloudSdk.init({ env: cloudSdk.DYNAMIC_CURRENT_ENV });
                return cloudSdk.getWXContext?.().OPENID;
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
async function main(event) {
    const openid = resolveOpenId(event);
    const displayName = event.displayName?.trim() || '用户';
    const now = new Date().toISOString();
    const session = {
        openid,
        displayName,
        role: 'landlord',
        lastLoginAt: now
    };
    return {
        session
    };
}
