const { listAssets, saveAsset } = require('../../services/asset');

Page({
  data: {
    name: '',
    region: ['上海市', '上海市', '松江区'],
    selectedAddress: '',
    addressDetail: '',
    locationName: '',
    latitude: null,
    longitude: null,
    mapHint: '可先手动选择地区和填写详细门牌；地图选点更适合真机调试。',
    rentalMode: 'whole',
    message: '',
    assets: [],
    assetSearchKeyword: '',
    visibleAssets: [],
    assetListExpanded: false
  },
  async onShow() {
    await this.loadAssets();
  },
  async loadAssets() {
    const assets = await listAssets();
    this.setData({
      assets: assets || []
    });
    this.applyAssetFilter(assets || [], this.data.assetSearchKeyword, this.data.assetListExpanded);
  },
  handleInputChange(event) {
    const field = event.currentTarget.dataset.field;
    this.setData({
      [field]: event.detail.value
    });
  },
  handleAssetSearch(event) {
    const keyword = event.detail.value || '';
    this.setData({
      assetSearchKeyword: keyword
    });
    this.applyAssetFilter(this.data.assets, keyword, this.data.assetListExpanded);
  },
  toggleAssetList() {
    const nextExpanded = !this.data.assetListExpanded;
    this.setData({
      assetListExpanded: nextExpanded
    });
    this.applyAssetFilter(this.data.assets, this.data.assetSearchKeyword, nextExpanded);
  },
  applyAssetFilter(assets, keyword, expanded) {
    const normalized = String(keyword || '').trim().toLowerCase();
    const filtered = !normalized
      ? assets
      : assets.filter((item) => {
          const text = [item.name, item.address, item.id, item.rentalMode].filter(Boolean).join(' ').toLowerCase();
          return text.indexOf(normalized) >= 0;
        });

    this.setData({
      visibleAssets: expanded || normalized ? filtered : filtered.slice(0, 8)
    });
  },
  handleRegionChange(event) {
    this.setData({
      region: event.detail.value
    });
  },
  handleRentalModeChange(event) {
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
      if (error && error.errMsg && error.errMsg.indexOf('cancel') >= 0) {
        return;
      }

      const errMsg = error && error.errMsg ? error.errMsg : '未知错误';
      this.setData({
        mapHint: '地图选点失败，通常是模拟器定位能力不足。请直接手动填写地址，或改用真机调试。'
      });
      wx.showModal({
        title: '地图选点暂不可用',
        content: '当前环境地图选点超时。你可以继续用地区 + 详细地址完成录入；如果想用地图选点，建议切到真机调试后再试。\n\n错误信息：' + errMsg,
        showCancel: false
      });
    }
  },
  buildAddress() {
    return [
      (this.data.region || []).join(''),
      this.data.selectedAddress,
      this.data.addressDetail
    ]
      .filter(Boolean)
      .join(' ');
  },
  async handleSubmit() {
    const finalAddress = this.buildAddress();
    const result = await saveAsset({
      asset: {
        name: this.data.name,
        address: finalAddress,
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
      message: '房源已保存：' + result.asset.name
    });
    await this.loadAssets();
  },
  openRoomsForm(event) {
    const assetId = event.currentTarget.dataset.assetId;
    const assetName = event.currentTarget.dataset.assetName;
    wx.navigateTo({
      url: '/pages/rooms-form/index?assetId=' + assetId + '&assetName=' + encodeURIComponent(assetName)
    });
  }
});
