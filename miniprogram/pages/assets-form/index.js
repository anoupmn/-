const { deleteAsset, listAssets, saveAsset } = require('../../services/asset');

function showModalAsync(options) {
  return new Promise((resolve) => {
    wx.showModal({
      ...options,
      success: resolve
    });
  });
}

function parseRegionFromAddress(address, currentRegion) {
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

function formatAmountLabel(value) {
  const amount = Number(value);
  return Number.isFinite(amount) ? `¥${amount}` : '未录入';
}

function formatLatestLeaseHint(value) {
  const text = String(value || '').trim();
  const matched = text.match(/^(\d{4}-\d{2}-\d{2})/);
  if (!matched) {
    return '最近录入租约：暂无';
  }

  return `最近录入租约：${matched[1]}`;
}

function normalizeAssets(rawAssets) {
  return rawAssets.map((item) => ({
    ...item,
    id: String(item.id || ''),
    name: String(item.name || ''),
    address: String(item.address || ''),
    rentalMode: String(item.rentalMode || ''),
    latestLeaseRentLabel: formatAmountLabel(item.latestLeaseRentAmount),
    latestLeasePropertyLabel: formatAmountLabel(item.latestLeasePropertyAmount),
    latestLeaseHint: formatLatestLeaseHint(item.latestLeaseAt)
  }));
}

Page({
  data: {
    name: '',
    region: ['上海市', '上海市', '松江区'],
    selectedAddress: '',
    addressDetail: '',
    locationName: '',
    latitude: null,
    longitude: null,
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
    const rawAssets = await listAssets();
    const assets = normalizeAssets(rawAssets || []);

    this.setData({
      assets
    });
    this.applyAssetFilter(assets, this.data.assetSearchKeyword, this.data.assetListExpanded);
  },
  handleInputChange(event) {
    const field = event.currentTarget.dataset.field;
    this.setData({
      [field]: event.detail.value
    });
  },
  handleAssetSearch(event) {
    const keyword = String(event.detail.value || '');
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
          const text = [item.name, item.address, item.id, item.rentalMode, item.latestLeaseHint]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();
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
    if (!String(this.data.name || '').trim()) {
      wx.showToast({
        title: '请填写房源名称',
        icon: 'none'
      });
      return;
    }

    try {
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
        message: `房源已保存：${String((result && result.asset && result.asset.name) || '')}`
      });
      await this.loadAssets();
    } catch (error) {
      console.error('save asset failed', error);
      wx.showToast({
        title: '保存房源失败，请稍后重试',
        icon: 'none'
      });
    }
  },
  openRoomsForm(event) {
    const assetId = String(event.currentTarget.dataset.assetId || '');
    const assetName = String(event.currentTarget.dataset.assetName || '');
    wx.navigateTo({
      url: `/pages/rooms-form/index?assetId=${assetId}&assetName=${encodeURIComponent(assetName)}`
    });
  },
  async handleDeleteAsset(event) {
    const assetId = String(event.currentTarget.dataset.assetId || '');
    const assetName = String(event.currentTarget.dataset.assetName || '');

    if (!assetId) {
      return;
    }

    const confirmation = await showModalAsync({
      title: '删除房源',
      content: `确认删除“${assetName}”吗？关联的房间、租约和账单也会一起删除。`
    });

    if (!confirmation.confirm) {
      return;
    }

    await deleteAsset({ assetId });
    wx.showToast({
      title: '房源已删除',
      icon: 'success'
    });
    await this.loadAssets();
  }
});
