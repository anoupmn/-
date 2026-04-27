export interface MockRecord {
  id: string;
  _id?: string;
  [key: string]: unknown;
}

export interface MockStore {
  landlordUsers: MockRecord[];
  assets: MockRecord[];
  rooms: MockRecord[];
  tenants: MockRecord[];
  leases: MockRecord[];
  bills: MockRecord[];
  repairRecords: MockRecord[];
  ownerExpenses: MockRecord[];
  receipts: MockRecord[];
  alerts: MockRecord[];
  abnormalFlags: MockRecord[];
  notificationPreferences: MockRecord[];
}

type CollectionName =
  | keyof MockStore
  | 'landlord_users'
  | 'assets'
  | 'rooms'
  | 'tenants'
  | 'leases'
  | 'bills'
  | 'repair_records'
  | 'owner_expenses'
  | 'receipts'
  | 'alerts'
  | 'abnormal_flags'
  | 'notification_preferences';
type Query = Partial<MockRecord>;

function resolveCollectionName(name: CollectionName): keyof MockStore {
  if (name === 'landlord_users') {
    return 'landlordUsers';
  }

  if (name === 'abnormal_flags') {
    return 'abnormalFlags';
  }

  if (name === 'repair_records') {
    return 'repairRecords';
  }

  if (name === 'owner_expenses') {
    return 'ownerExpenses';
  }

  if (name === 'notification_preferences') {
    return 'notificationPreferences';
  }

  return name;
}

function cloneRecord<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function createMockStore(): MockStore {
  return {
    landlordUsers: [],
    assets: [],
    rooms: [],
    tenants: [],
    leases: [],
    bills: [],
    repairRecords: [],
    ownerExpenses: [],
    receipts: [],
    alerts: [],
    abnormalFlags: [],
    notificationPreferences: []
  };
}

function filterRecords(records: MockRecord[], query: Query) {
  return records.filter((record) =>
    Object.entries(query).every(([key, value]) => record[key] === value)
  );
}

export function createMockDb(store: MockStore) {
  return {
    collection(name: CollectionName) {
      const key = resolveCollectionName(name);
      return {
        async get() {
          return {
            data: cloneRecord(store[key])
          };
        },
        async add({ data }: { data: MockRecord }) {
          const record = cloneRecord({
            ...data,
            _id: data._id ?? data.id
          });
          store[key].push(record);
          return {
            _id: record._id ?? record.id
          };
        },
        where(query: Query) {
          return {
            get: async () => ({
              data: cloneRecord(filterRecords(store[key], query))
            }),
            update: async ({ data }: { data: Partial<MockRecord> }) => {
              const matches = filterRecords(store[key], query);
              matches.forEach((record) => {
                Object.assign(record, cloneRecord(data));
              });
              return {
                stats: {
                  updated: matches.length
                }
              };
            },
            remove: async () => {
              const remaining = store[key].filter(
                (record) => !Object.entries(query).every(([key, value]) => record[key] === value)
              );
              const removed = store[key].length - remaining.length;
              store[key].splice(0, store[key].length, ...remaining);
              return {
                stats: {
                  removed
                }
              };
            }
          };
        },
        doc(id: string) {
          return {
            get: async () => ({
              data: cloneRecord(store[key].find((record) => record._id === id) ?? null)
            }),
            update: async ({ data }: { data: Partial<MockRecord> }) => {
              const record = store[key].find((item) => item._id === id);
              if (record) {
                Object.assign(record, cloneRecord(data));
              }
              return {
                stats: {
                  updated: record ? 1 : 0
                }
              };
            },
            remove: async () => {
              const index = store[key].findIndex((record) => record._id === id);
              if (index >= 0) {
                store[key].splice(index, 1);
              }
              return {
                stats: {
                  removed: index >= 0 ? 1 : 0
                }
              };
            }
          };
        }
      };
    },
    command: {
      in(values: unknown[]) {
        return {
          $in: values
        };
      },
      neq(value: unknown) {
        return {
          $neq: value
        };
      }
    }
  };
}

export function createMockCloudContext(openid = 'landlord-openid') {
  return {
    getWXContext: () => getWXContext(openid),
    database: () => createMockDb(createMockStore())
  };
}

export function getWXContext(openid = 'landlord-openid') {
  return {
    OPENID: openid
  };
}
