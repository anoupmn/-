export function getStorage<T>(key: string): T | null {
  const value = wx.getStorageSync(key) as T | undefined;
  return value ?? null;
}

export function setStorage<T>(key: string, value: T) {
  wx.setStorageSync(key, value);
}

export function removeStorage(key: string) {
  wx.removeStorageSync(key);
}
