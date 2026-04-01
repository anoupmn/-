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
        where(query: Partial<MockRecord>) {
          const data = store[name].filter((record) =>
            Object.entries(query).every(([key, value]) => record[key] === value)
          );

          return {
            get: async () => ({
              data: cloneRecord(data)
            })
          };
        }
      };
    }
  };
}

export function getWXContext(openid = 'landlord-openid') {
  return {
    OPENID: openid
  };
}
