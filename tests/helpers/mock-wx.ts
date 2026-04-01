type CloudFunctionCall = {
  name: string;
  data?: Record<string, unknown>;
};

type StorageState = Record<string, unknown>;

export type MockWx = typeof wx & {
  __storage: StorageState;
  __calls: CloudFunctionCall[];
  __setCloudHandler: (
    handler: (input: CloudFunctionCall) => Promise<{ result: unknown }> | { result: unknown }
  ) => void;
  __reset: () => void;
};

const storage: StorageState = {};
const calls: CloudFunctionCall[] = [];

let cloudHandler: (
  input: CloudFunctionCall
) => Promise<{ result: unknown }> | { result: unknown } = async ({ data }) => ({
  result: data ?? {}
});

const mockWx = {
  __storage: storage,
  __calls: calls,
  __setCloudHandler(handler: typeof cloudHandler) {
    cloudHandler = handler;
  },
  __reset() {
    Object.keys(storage).forEach((key) => {
      delete storage[key];
    });
    calls.splice(0, calls.length);
    cloudHandler = async ({ data }) => ({ result: data ?? {} });
  },
  getStorageSync(key: string) {
    return storage[key];
  },
  setStorageSync(key: string, value: unknown) {
    storage[key] = value;
  },
  removeStorageSync(key: string) {
    delete storage[key];
  },
  showToast() {
    return undefined;
  },
  navigateTo() {
    return Promise.resolve();
  },
  reLaunch() {
    return Promise.resolve();
  },
  cloud: {
    init() {
      return undefined;
    },
    async callFunction(input: CloudFunctionCall) {
      calls.push(input);
      return cloudHandler(input);
    }
  }
} as unknown as MockWx;

Object.defineProperty(global, 'wx', {
  configurable: true,
  writable: true,
  value: mockWx
});

export function getMockWx(): MockWx {
  return mockWx;
}

beforeEach(() => {
  mockWx.__reset();
});
