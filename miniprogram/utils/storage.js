function getStorage(key) {
  const value = wx.getStorageSync(key);
  return value === undefined ? null : value;
}

function setStorage(key, value) {
  wx.setStorageSync(key, value);
}

function removeStorage(key) {
  wx.removeStorageSync(key);
}

module.exports = {
  getStorage,
  setStorage,
  removeStorage
};
