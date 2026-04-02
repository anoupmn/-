async function callCloudFunction(name, data) {
  const response = await wx.cloud.callFunction({
    name,
    data
  });

  return response.result;
}

module.exports = {
  callCloudFunction
};
