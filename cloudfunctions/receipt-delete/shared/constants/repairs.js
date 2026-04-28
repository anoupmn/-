"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.REPAIR_FREQUENCY_THRESHOLD = exports.REPAIR_FREQUENCY_WINDOW_DAYS = exports.REPAIR_CATEGORY_OPTIONS = exports.REPAIR_CATEGORY_LABELS = exports.REPAIR_CATEGORIES = void 0;
exports.REPAIR_CATEGORIES = {
    plumbing: 'plumbing',
    electrical: 'electrical',
    appliance: 'appliance',
    structure: 'structure',
    safety: 'safety',
    other: 'other'
};
exports.REPAIR_CATEGORY_LABELS = {
    [exports.REPAIR_CATEGORIES.plumbing]: '水路',
    [exports.REPAIR_CATEGORIES.electrical]: '电路',
    [exports.REPAIR_CATEGORIES.appliance]: '家电',
    [exports.REPAIR_CATEGORIES.structure]: '结构',
    [exports.REPAIR_CATEGORIES.safety]: '安全',
    [exports.REPAIR_CATEGORIES.other]: '其他'
};
exports.REPAIR_CATEGORY_OPTIONS = Object.values(exports.REPAIR_CATEGORIES).map((value) => ({
    value,
    label: exports.REPAIR_CATEGORY_LABELS[value]
}));
exports.REPAIR_FREQUENCY_WINDOW_DAYS = 30;
exports.REPAIR_FREQUENCY_THRESHOLD = 3;
