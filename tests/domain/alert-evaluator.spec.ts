import { evaluateAlerts, recommend } from '../../cloudfunctions/shared/calculators/alert-evaluator';
import type { AbnormalFlag } from '../../cloudfunctions/shared/schemas/abnormal-flag';
import type { Asset } from '../../cloudfunctions/shared/schemas/asset';
import type { Bill } from '../../cloudfunctions/shared/schemas/bill';
import type { Lease } from '../../cloudfunctions/shared/schemas/lease';
import type { Room } from '../../cloudfunctions/shared/schemas/room';
import type { Tenant } from '../../cloudfunctions/shared/schemas/tenant';

const asset: Asset = {
  id: 'asset_1',
  landlordOpenId: 'openid',
  name: '虹桥公寓',
  rentalMode: 'room',
  address: '',
  note: '',
  createdAt: '2026-04-01T00:00:00.000Z',
  updatedAt: '2026-04-01T00:00:00.000Z'
};

const room: Room = {
  id: 'room_1',
  landlordOpenId: 'openid',
  assetId: 'asset_1',
  name: 'A101',
  note: '',
  isWholeUnitDefault: false,
  createdAt: '2026-04-01T00:00:00.000Z',
  updatedAt: '2026-04-01T00:00:00.000Z'
};

const tenant: Tenant = {
  id: 'tenant_1',
  landlordOpenId: 'openid',
  name: '王租客',
  phone: '',
  note: '',
  createdAt: '2026-04-01T00:00:00.000Z',
  updatedAt: '2026-04-01T00:00:00.000Z'
};

const activeLease: Lease = {
  id: 'lease_1',
  landlordOpenId: 'openid',
  roomId: 'room_1',
  tenantId: 'tenant_1',
  startDate: '2026-03-01',
  endDate: '2026-06-30',
  billingCycleDays: 30,
  rentAmount: 2800,
  depositAmount: 2800,
  note: '',
  closedAt: null,
  createdAt: '2026-03-01T00:00:00.000Z',
  updatedAt: '2026-03-01T00:00:00.000Z'
};

describe('alert evaluator', () => {
  it('builds overdue, vacancy_long and manual_abnormal alerts with stable recommendation priority', () => {
    const overdueBill: Bill = {
      id: 'bill_1',
      landlordOpenId: 'openid',
      leaseId: 'lease_1',
      roomId: 'room_1',
      type: 'rent',
      section: 'rent',
      dueDate: '2026-03-20',
      amount: 2800,
      status: 'pending',
      receivedAt: null,
      receivedAmount: null,
      createdAt: '2026-03-01T00:00:00.000Z',
      updatedAt: '2026-03-01T00:00:00.000Z'
    };

    const vacancyRoom: Room = {
      ...room,
      id: 'room_2',
      name: 'A102'
    };

    const vacancyFlag: AbnormalFlag = {
      id: 'flag_1',
      landlordOpenId: 'openid',
      roomId: room.id,
      active: true,
      reason: '租客反馈空调漏水',
      createdAt: '2026-04-01T00:00:00.000Z',
      updatedAt: '2026-04-01T00:00:00.000Z',
      clearedAt: null
    };

    const alerts = evaluateAlerts({
      assets: [asset],
      rooms: [room, vacancyRoom],
      leases: [
        activeLease,
        {
          ...activeLease,
          id: 'lease_ended',
          roomId: vacancyRoom.id,
          tenantId: tenant.id,
          startDate: '2026-01-01',
          endDate: '2026-02-20',
          closedAt: '2026-02-20T00:00:00.000Z'
        }
      ],
      tenants: [tenant],
      bills: [overdueBill],
      abnormalFlags: [vacancyFlag],
      now: '2026-04-10T00:00:00.000Z'
    });

    expect(alerts.map((item) => item.type)).toEqual(
      expect.arrayContaining(['overdue', 'vacancy_long', 'manual_abnormal'])
    );
    expect(alerts.find((item) => item.type === 'manual_abnormal')?.summary).toContain('租客反馈空调漏水');
    expect(recommend(alerts)?.type).toBe('overdue');
  });

  it('ranks manual_abnormal above vacancy_long and expiring', () => {
    const alerts = evaluateAlerts({
      assets: [asset],
      rooms: [room],
      leases: [
        {
          ...activeLease,
          endDate: '2026-04-12'
        }
      ],
      tenants: [tenant],
      bills: [],
      abnormalFlags: [
        {
          id: 'flag_1',
          landlordOpenId: 'openid',
          roomId: room.id,
          active: true,
          reason: '门锁损坏',
          createdAt: '2026-04-01T00:00:00.000Z',
          updatedAt: '2026-04-01T00:00:00.000Z',
          clearedAt: null
        }
      ],
      now: '2026-04-01T00:00:00.000Z'
    });

    expect(alerts.find((item) => item.type === 'expiring')).toBeTruthy();
    expect(alerts.find((item) => item.type === 'manual_abnormal')).toBeTruthy();
    expect(recommend(alerts)?.type).toBe('manual_abnormal');
  });
});
