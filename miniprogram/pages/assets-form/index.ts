import { listAssets, saveAsset } from '../../services/asset';

Page({
  data: {
    name: '',
    region: ['上海市', '上海市', '松江区'],
    selectedAddress: '',
    addressDetail: '',
    locationName: '',
    latitude: null as number | null,
    longitude: null as number | null,
    mapHint: '可先手动选择地区和填写详细门牌；地图选点更适合真机调试。',
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
      const nextName = this.data.name || result.name || '';

      this.setData({
        name: nextName,
        selectedAddress: result.address || '',
        addressDetail: result.address || this.data.addressDetail,
        locationName: result.name || '',
        latitude: result.latitude,
        longitude: result.longitude,
        mapHint: '地图选点成功，已自动回填地址。'
      });
    } catch (error) {
      const errMsg = error && typeof error === 'object' && 'errMsg' in error ? String(error.errMsg) : '';
      if (errMsg.includes('cancel')) {
        return;
      }

      this.setData({
        mapHint: '地图选点失败，通常是模拟器定位能力不足。请直接手动填写地址，或改用真机调试。'
      });
      wx.showModal({
        title: '地图选点暂不可用',
        content: `当前环境地图选点超时。你可以继续用地区 + 详细地址完成录入；如果想用地图选点，建议切到真机调试后再试。\n\n错误信息：${errMsg || '未知错误'}`,
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
