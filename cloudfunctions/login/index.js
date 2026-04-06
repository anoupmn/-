"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.main = main;
function resolveOpenId(event) {
    const openid = event.__mockContext?.getWXContext?.().OPENID;
    if (!openid) {
        throw new Error('Missing OPENID from cloud context.');
    }
    return openid;
}
async function main(event) {
    const openid = resolveOpenId(event);
    const displayName = event.displayName?.trim() || '房东';
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
