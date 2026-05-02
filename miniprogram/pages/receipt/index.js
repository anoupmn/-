"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const receipt_1 = require("../../services/receipt");
function buildReceiptShareTitle(receipt) {
    if (!receipt) {
        return '收款收据（非发票）';
    }
    return `${receipt.receiptNo || '收据'} ${receipt.tenantName || '租客'} 收款收据`;
}
function formatDateTime(value) {
    const source = String(value || '').trim();
    if (!source) {
        return '';
    }
    const matched = source.match(/^(\d{4}-\d{2}-\d{2})[T\s](\d{2}:\d{2})/);
    if (matched) {
        return `${matched[1]} ${matched[2]}`;
    }
    return source.replace('T', ' ').replace(/\.\d{3}Z?$/, '').replace(/Z$/, '');
}
function normalizeReceipt(receipt) {
    return {
        ...receipt,
        displayReceivedAt: formatDateTime(receipt.receivedAt),
        displayCreatedAt: formatDateTime(receipt.createdAt),
        items: Array.isArray(receipt.items)
            ? receipt.items.map((item) => ({
                ...item,
                displayReceivedAt: formatDateTime(item.receivedAt)
            }))
            : []
    };
}
function buildReceiptSummary(receipt) {
    return [
        '收款收据（非发票）',
        `收据编号：${receipt.receiptNo || ''}`,
        `房源/房间：${receipt.assetName || ''} / ${receipt.roomName || ''}`,
        `租客：${receipt.tenantName || ''}`,
        `合计金额：¥${receipt.totalAmount || 0}`,
        `收款日期：${receipt.displayReceivedAt || receipt.receivedAt || ''}`
    ].join('\n');
}
function normalizePdfFileName(value) {
    const baseName = String(value || '收款收据')
        .replace(/\.pdf$/i, '')
        .trim()
        .replace(/[\\/:*?"<>|\s]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 100);
    return `${baseName || '收款收据'}.pdf`;
}
function copyPdfWithFileName(tempFilePath, fileName) {
    var _a;
    const userDataPath = (_a = wx.env) === null || _a === void 0 ? void 0 : _a.USER_DATA_PATH;
    if (!userDataPath || typeof wx.getFileSystemManager !== 'function') {
        return Promise.resolve(tempFilePath);
    }
    const fs = wx.getFileSystemManager();
    const localFilePath = `${userDataPath}/${normalizePdfFileName(fileName)}`;
    return new Promise((resolve) => {
        fs.unlink({
            filePath: localFilePath,
            complete: () => {
                fs.copyFile({
                    srcPath: tempFilePath,
                    destPath: localFilePath,
                    success: () => resolve(localFilePath),
                    fail: () => resolve(tempFilePath)
                });
            }
        });
    });
}
Page({
    data: {
        billId: '',
        receiptId: '',
        receipt: null,
        loading: true,
        exportingPdf: false,
        deleting: false
    },
    async onLoad(query) {
        this.setData({
            billId: String(query.billId || ''),
            receiptId: String(query.receiptId || '')
        });
        await this.loadReceipt();
    },
    async loadReceipt() {
        this.setData({
            loading: true
        });
        try {
            const receipt = this.data.receiptId
                ? await (0, receipt_1.getReceipt)({ receiptId: this.data.receiptId })
                : await (0, receipt_1.createReceipt)({ billIds: [this.data.billId] });
            const normalizedReceipt = normalizeReceipt(receipt);
            this.setData({
                receipt: normalizedReceipt,
                receiptId: String(receipt.id || '')
            });
        }
        catch (error) {
            console.error('load receipt failed', error);
            wx.showToast({
                title: '收据加载失败',
                icon: 'none'
            });
        }
        finally {
            this.setData({
                loading: false
            });
        }
    },
    onShareAppMessage() {
        const receipt = this.data.receipt;
        const receiptId = String(this.data.receiptId || (receipt === null || receipt === void 0 ? void 0 : receipt.id) || '');
        return {
            title: buildReceiptShareTitle(receipt),
            path: receiptId ? `/pages/receipt/index?receiptId=${receiptId}` : '/pages/receipt/index'
        };
    },
    copyReceiptSummary() {
        if (!this.data.receipt) {
            return;
        }
        wx.setClipboardData({
            data: buildReceiptSummary(this.data.receipt),
            success: () => {
                wx.showToast({
                    title: '摘要已复制，可保存凭证',
                    icon: 'none'
                });
            }
        });
    },
    async exportPrintablePdf() {
        if (!this.data.receiptId || this.data.exportingPdf) {
            return;
        }
        this.setData({
            exportingPdf: true
        });
        try {
            const result = await (0, receipt_1.exportReceiptPdf)({ receiptId: this.data.receiptId });
            const fileID = String(result.fileID || '');
            if (!fileID) {
                wx.showToast({
                    title: 'PDF已生成，请在真机云端下载',
                    icon: 'none'
                });
                return;
            }
            const downloaded = await wx.cloud.downloadFile({ fileID });
            const localFilePath = await copyPdfWithFileName(downloaded.tempFilePath, result.fileName);
            await wx.openDocument({
                filePath: localFilePath,
                fileType: 'pdf',
                showMenu: true
            });
        }
        catch (error) {
            console.error('export receipt pdf failed', error);
            wx.showToast({
                title: '导出PDF失败',
                icon: 'none'
            });
        }
        finally {
            this.setData({
                exportingPdf: false
            });
        }
    },
    async handleDeleteReceipt() {
        var _a;
        if (!((_a = this.data.receipt) === null || _a === void 0 ? void 0 : _a.id) || this.data.deleting) {
            return;
        }
        const confirmed = await wx.showModal({
            title: '删除收据',
            content: '删除后会解除账单上的收据引用，可重新开具该月收据。',
            confirmText: '删除',
            confirmColor: '#c0392b'
        });
        if (!confirmed.confirm) {
            return;
        }
        this.setData({
            deleting: true
        });
        try {
            await (0, receipt_1.deleteReceipt)({
                receiptId: this.data.receipt.id
            });
            wx.showToast({
                title: '已删除',
                icon: 'none'
            });
            wx.navigateBack();
        }
        catch (error) {
            console.error('delete receipt failed', error);
            wx.showToast({
                title: '删除失败',
                icon: 'none'
            });
        }
        finally {
            this.setData({
                deleting: false
            });
        }
    }
});
