import { listAssets, saveAsset } from '../../services/asset';

function parseRegionFromAddress(address: string, currentRegion: string[]) {
  const fallback = Array.isArray(currentRegion) && currentRegion.length === 3
    ? currentRegion
    : ['上海市', '上海市', '松江区'];
  const normalized = String(address || '').replace(/\s+/g, '');

  if (!normalized) {
    return fallback;
  }

  const municipalityMatch = normalized.match(/^(北京市|上海市|天津市|重庆市)/);
  if (municipalityMatch) {
    const city = municipalityMatch[1];
    const rest = normalized.slice(city.length);
    const districtMatch = rest.match(/^(.*?(?:区|县|市|旗))/);
    return [city, city, districtMatch ? districtMatch[1] : fallback[2]];
  }

  const provinceMatch = normalized.match(/^(.*?(?:省|自治区|特别行政区))/);
  if (provinceMatch) {
    const province = provinceMatch[1];
    const rest = normalized.slice(province.length);
    const cityMatch = rest.match(/^(.*?(?:市|州|地区|盟))/);
    const city = cityMatch ? cityMatch[1] : fallback[1];
    const districtSource = cityMatch ? rest.slice(city.length) : rest;
    const districtMatch = districtSource.match(/^(.*?(?:区|县|市|旗))/);
    return [province, city, districtMatch ? districtMatch[1] : fallback[2]];
  }

  const cityMatch = normalized.match(/^(.*?(?:市|州|地区|盟))/);
  if (cityMatch) {
    const city = cityMatch[1];
    const rest = normalized.slice(city.length);
    const districtMatch = rest.match(/^(.*?(?:区|县|市|旗))/);
    return [fallback[0] || city, city, districtMatch ? districtMatch[1] : fallback[2]];
  }

  return fallback;
}

Page({
  data: {
    name: '',
    region: ['上海市', '上海市', '松江区'],
    selectedAddress: '',
    addressDetail: '',
    locationName: '',
    latitude: null as number | null,
    longitude: null as number | null,
    rentalMode: 'whole',
    message: '',
    assets: [] as Array<Record<string, unknown>>
  },
  async onShow() {
    await this.loadAssets();
  },
  async loadAssets() {
    const assets = (await listAssets()) as Array<Record<string, unknown>>;
    this.setData({
      assets: assets ?? []
    });
  },
  handleInputChange(event: WechatMiniprogram.Input) {
    const field = event.currentTarget.dataset.field as string;
    this.setData({
      [field]: event.detail.value
    });
  },
  handleRegionChange(event: WechatMiniprogram.CustomEvent) {
    this.setData({
      region: event.detail.value as string[]
    });
  },
  handleRentalModeChange(event: WechatMiniprogram.PickerChange) {
    this.setData({
      rentalMode: event.detail.value === '0' ? 'whole' : 'room'
    });
  },
  async chooseMapLocation() {
    try {
      const result = await wx.chooseLocation({});
      const locationName = (result.name || '').trim();
      const nextRegion = parseRegionFromAddress(result.address || '', this.data.region);

      this.setData({
        name: locationName || this.data.name,
        region: nextRegion,
        selectedAddress: result.address || '',
        locationName,
        latitude: result.latitude,
        longitude: result.longitude
      });
    } catch (error) {
      const errMsg = error && typeof error === 'object' && 'errMsg' in error ? String(error.errMsg) : '';
      if (errMsg.includes('cancel')) {
        return;
      }

      wx.showModal({
        title: '地图选点暂不可用',
        content: `当前环境地图选点失败。请稍后重试或在真机调试中使用地图选点。\n\n错误信息：${errMsg || '未知错误'}`,
        showCancel: false
      });
    }
  },
  buildAddress() {
    return [this.data.region.join(''), this.data.selectedAddress, this.data.addressDetail]
      .filter(Boolean)
      .join(' ');
  },
  async handleSubmit() {
    const result = await saveAsset({
      asset: {
        name: this.data.name,
        address: this.buildAddress(),
        rentalMode: this.data.rentalMode,
        note: ''
      }
    });
    this.setData({
      name: '',
      region: ['上海市', '上海市', '松江区'],
      selectedAddress: '',
      addressDetail: '',
      locationName: '',
      latitude: null,
      longitude: null,
      message: `房源已保存：${String((result as { asset?: { name?: string } }).asset?.name ?? '')}`
    });
    await this.loadAssets();
  },
  openRoomsForm(event: WechatMiniprogram.BaseEvent) {
    const assetId = event.currentTarget.dataset.assetId as string;
    const assetName = event.currentTarget.dataset.assetName as string;
    wx.navigateTo({
      url: `/pages/rooms-form/index?assetId=${assetId}&assetName=${encodeURIComponent(assetName)}`
    });
  }
});
