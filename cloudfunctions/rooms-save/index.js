"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.main = main;
const room_repository_1 = require("./shared/repositories/room-repository");
const runtime_1 = require("./shared/runtime");
async function main(event) {
    const db = (0, runtime_1.resolveDb)(event);
    if (event.roomId) {
        return (0, room_repository_1.updateRoom)(db, event.roomId, event.room, event);
    }
    return (0, room_repository_1.createRoom)(db, (0, runtime_1.resolveLandlordOpenId)(event), event.room, event);
}
