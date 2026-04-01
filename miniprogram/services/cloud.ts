export async function callCloudFunction<T>(name: string, data?: Record<string, unknown>) {
  const response = await wx.cloud.callFunction({
    name,
    data
  });

  return response.result as T;
}
