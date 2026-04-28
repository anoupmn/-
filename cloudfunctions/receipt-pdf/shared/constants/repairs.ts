export const REPAIR_CATEGORIES = {
  plumbing: 'plumbing',
  electrical: 'electrical',
  appliance: 'appliance',
  structure: 'structure',
  safety: 'safety',
  other: 'other'
} as const;

export type RepairCategory = (typeof REPAIR_CATEGORIES)[keyof typeof REPAIR_CATEGORIES];

export const REPAIR_CATEGORY_LABELS: Record<RepairCategory, string> = {
  [REPAIR_CATEGORIES.plumbing]: '水路',
  [REPAIR_CATEGORIES.electrical]: '电路',
  [REPAIR_CATEGORIES.appliance]: '家电',
  [REPAIR_CATEGORIES.structure]: '结构',
  [REPAIR_CATEGORIES.safety]: '安全',
  [REPAIR_CATEGORIES.other]: '其他'
};

export const REPAIR_CATEGORY_OPTIONS = Object.values(REPAIR_CATEGORIES).map((value) => ({
  value,
  label: REPAIR_CATEGORY_LABELS[value]
}));

export const REPAIR_FREQUENCY_WINDOW_DAYS = 30;
export const REPAIR_FREQUENCY_THRESHOLD = 3;
