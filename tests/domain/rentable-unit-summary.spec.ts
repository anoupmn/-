import { buildRentableUnitSummary } from '../../cloudfunctions/shared/calculators/rentable-unit';

describe('rentable unit summary', () => {
  it('builds whole-unit displayName and occupied summary', () => {
    const summary = buildRentableUnitSummary({
      asset: {
        id: 'asset_1',
        landlordOpenId: 'openid',
        name: '松江公寓 201',
        rentalMode: 'whole',
        address: '',
        note: '',
        createdAt: '2026-03-01T00:00:00.000Z',
        updatedAt: '2026-03-01T00:00:00.000Z'
      },
      room: {
        id: 'room_1',
        landlordOpenId: 'openid',
        assetId: 'asset_1',
        name: '整租单元',
        note: '',
        isWholeUnitDefault: true,
        createdAt: '2026-03-01T00:00:00.000Z',
        updatedAt: '2026-03-01T00:00:00.000Z'
      },
      leases: [
        {
          id: 'lease_1',
          landlordOpenId: 'openid',
          roomId: 'room_1',
          tenantId: 'tenant_1',
          startDate: '2026-03-01',
          endDate: '2026-05-31',
          billingCycleDays: 30,
          rentAmount: 2500,
          depositAmount: 2000,
          note: '',
          closedAt: null,
          createdAt: '2026-03-01T00:00:00.000Z',
          updatedAt: '2026-03-01T00:00:00.000Z'
        }
      ],
      tenants: [
        {
          id: 'tenant_1',
          landlordOpenId: 'openid',
          name: '王租客',
          phone: '',
          note: '',
          createdAt: '2026-03-01T00:00:00.000Z',
          updatedAt: '2026-03-01T00:00:00.000Z'
        }
      ],
      now: '2026-04-01T00:00:00.000Z'
    });

    expect(summary.displayName).toBe('松江公寓 201');
    expect(summary.currentStatus).toBe('occupied');
    expect(summary.currentTenantName).toBe('王租客');
    expect(summary.nextReceivableAmount).toBe(2500);
  });

  it('excludes deposit-like bills from next rent core prompt', () => {
    const summary = buildRentableUnitSummary({
      asset: {
        id: 'asset_1',
        landlordOpenId: 'openid',
        name: '松江公寓 201',
        rentalMode: 'whole',
        address: '',
        note: '',
        createdAt: '2026-03-01T00:00:00.000Z',
        updatedAt: '2026-03-01T00:00:00.000Z'
      },
      room: {
        id: 'room_1',
        landlordOpenId: 'openid',
        assetId: 'asset_1',
        name: '整租单元',
        note: '',
        isWholeUnitDefault: true,
        createdAt: '2026-03-01T00:00:00.000Z',
        updatedAt: '2026-03-01T00:00:00.000Z'
      },
      leases: [
        {
          id: 'lease_1',
          landlordOpenId: 'openid',
          roomId: 'room_1',
          tenantId: 'tenant_1',
          startDate: '2026-03-01',
          endDate: '2026-05-31',
          billingCycleDays: 30,
          rentAmount: 2500,
          depositAmount: 2000,
          note: '',
          closedAt: null,
          createdAt: '2026-03-01T00:00:00.000Z',
          updatedAt: '2026-03-01T00:00:00.000Z'
        }
      ],
      tenants: [
        {
          id: 'tenant_1',
          landlordOpenId: 'openid',
          name: '王租客',
          phone: '',
          note: '',
          createdAt: '2026-03-01T00:00:00.000Z',
          updatedAt: '2026-03-01T00:00:00.000Z'
        }
      ],
      bills: [
        {
          id: 'bill_fire_deposit',
          landlordOpenId: 'openid',
          leaseId: 'lease_1',
          roomId: 'room_1',
          type: 'fire_deposit',
          section: 'deposit',
          dueDate: '2026-04-01',
          amount: 300,
          status: 'pending',
          receivedAt: null,
          receivedAmount: null,
          feeNature: 'deposit',
          responsibility: 'tenant',
          cadence: 'once',
          isDepositLike: true,
          isOneTime: true,
          legacy: false,
          createdAt: '2026-03-01T00:00:00.000Z',
          updatedAt: '2026-03-01T00:00:00.000Z'
        },
        {
          id: 'bill_rent',
          landlordOpenId: 'openid',
          leaseId: 'lease_1',
          roomId: 'room_1',
          type: 'rent',
          section: 'rent',
          dueDate: '2026-04-10',
          amount: 2500,
          status: 'pending',
          receivedAt: null,
          receivedAmount: null,
          feeNature: 'recurring',
          responsibility: 'tenant',
          cadence: 'cycle',
          isDepositLike: false,
          isOneTime: false,
          legacy: false,
          createdAt: '2026-03-01T00:00:00.000Z',
          updatedAt: '2026-03-01T00:00:00.000Z'
        }
      ],
      now: '2026-04-02T00:00:00.000Z'
    });

    expect(summary.nextReceivableDate).toBe('2026-04-10');
    expect(summary.nextReceivableAmount).toBe(2500);
  });
});
