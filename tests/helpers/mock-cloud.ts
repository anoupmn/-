export interface MockRecord {
  id: string;
  [key: string]: unknown;
}

export interface MockStore {
  landlordUsers: MockRecord[];
  assets: MockRecord[];
  rooms: MockRecord[];
  tenants: MockRecord[];
  leases: MockRecord[];
}

type CollectionName = keyof MockStore;
type Query = Partial<MockRecord>;

function cloneRecord<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function createMockStore(): MockStore {
  return {
    landlordUsers: [],
    assets: [],
    rooms: [],
    tenants: [],
    leases: []
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
      return {
        async get() {
          return {
            data: cloneRecord(store[name])
          };
        },
        async add({ data }: { data: MockRecord }) {
          store[name].push(cloneRecord(data));
          return {
            _id: data.id
          };
        },
        where(query: Query) {
          return {
            get: async () => ({
              data: cloneRecord(filterRecords(store[name], query))
            }),
            update: async ({ data }: { data: Partial<MockRecord> }) => {
              const matches = filterRecords(store[name], query);
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
              const remaining = store[name].filter(
                (record) => !Object.entries(query).every(([key, value]) => record[key] === value)
              );
              const removed = store[name].length - remaining.length;
              store[name].splice(0, store[name].length, ...remaining);
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
              data: cloneRecord(store[name].find((record) => record.id === id) ?? null)
            }),
            update: async ({ data }: { data: Partial<MockRecord> }) => {
              const record = store[name].find((item) => item.id === id);
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
              const index = store[name].findIndex((record) => record.id === id);
              if (index >= 0) {
                store[name].splice(index, 1);
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
