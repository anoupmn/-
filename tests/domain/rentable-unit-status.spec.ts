import { buildRentableUnitSummary } from '../../cloudfunctions/shared/calculators/rentable-unit';
import { BILL_RISK_TAGS, BILL_STATUSES, UNIT_MAIN_STATUSES } from '../../cloudfunctions/shared/constants/statuses';
import type { Bill } from '../../cloudfunctions/shared/schemas/bill';
import type { Lease } from '../../cloudfunctions/shared/schemas/lease';

const activeLease: Lease = {
  id: 'lease_1',
  landlordOpenId: 'openid',
  roomId: 'room_1',
  tenantId: 'tenant_1',
  startDate: '2026-04-01',
  endDate: '2026-06-30',
  billingCycleDays: 30,
  rentAmount: 2800,
  depositAmount: 2800,
  feeRules: {
    rent: { amount: 2800, cadence: 'cycle' },
    deposit: { amount: 2800, cadence: 'once' },
    management: { amount: 0, cadence: 'cycle' },
    fireDeposit: { amount: 0, cadence: 'once' },
    lockCardDeposit: { amount: 0, cadence: 'once' },
    water: { amount: 120, cadence: 'cycle' },
    electricity: { amount: 80, cadence: 'cycle' },
    property: { amount: 100, cadence: 'cycle' },
    customFeeItems: []
  },
  note: '',
  closedAt: null,
  createdAt: '2026-04-01T00:00:00.000Z',
  updatedAt: '2026-04-01T00:00:00.000Z'
};

describe('rentable unit status', () => {
  it('keeps occupied as the main status while adding expiring risk tags and next receivable from bills', () => {
    const bills: Bill[] = [
      {
        id: 'bill_rent',
        landlordOpenId: 'openid',
        leaseId: 'lease_1',
        roomId: 'room_1',
        type: 'rent',
        section: 'rent',
        dueDate: '2026-04-12',
        amount: 2800,
        status: BILL_STATUSES.pending,
        receivedAt: null,
        receivedAmount: null,
        createdAt: '2026-04-01T00:00:00.000Z',
        updatedAt: '2026-04-01T00:00:00.000Z'
      }
    ];

    const summary = buildRentableUnitSummary({
      asset: {
        id: 'asset_1',
        landlordOpenId: 'openid',
        name: '虹桥公寓',
        rentalMode: 'room',
        address: '',
        note: '',
        createdAt: '2026-04-01T00:00:00.000Z',
        updatedAt: '2026-04-01T00:00:00.000Z'
      },
      room: {
        id: 'room_1',
        landlordOpenId: 'openid',
        assetId: 'asset_1',
        name: 'A101',
        note: '',
        isWholeUnitDefault: false,
        createdAt: '2026-04-01T00:00:00.000Z',
        updatedAt: '2026-04-01T00:00:00.000Z'
      },
      leases: [activeLease],
      tenants: [
        {
          id: 'tenant_1',
          landlordOpenId: 'openid',
          name: '王租客',
          phone: '',
          note: '',
          createdAt: '2026-04-01T00:00:00.000Z',
          updatedAt: '2026-04-01T00:00:00.000Z'
        }
      ],
      bills,
      now: '2026-04-01T00:00:00.000Z'
    });

    expect(summary.mainStatus).toBe(UNIT_MAIN_STATUSES.occupied);
    expect(summary.currentStatus).toBe(UNIT_MAIN_STATUSES.occupied);
    expect(summary.riskTags).toContain(BILL_RISK_TAGS.expiring);
    expect(summary.nextReceivableDate).toBe('2026-04-12');
    expect(summary.nextReceivableAmount).toBe(2800);
  });

  it('adds overdue and abnormal risk tags when outstanding rent has passed due date', () => {
    const summary = buildRentableUnitSummary({
      asset: {
        id: 'asset_1',
        landlordOpenId: 'openid',
        name: '虹桥公寓',
        rentalMode: 'whole',
        address: '',
        note: '',
        createdAt: '2026-04-01T00:00:00.000Z',
        updatedAt: '2026-04-01T00:00:00.000Z'
      },
      room: {
        id: 'room_1',
        landlordOpenId: 'openid',
        assetId: 'asset_1',
        name: '整租单元',
        note: '',
        isWholeUnitDefault: true,
        createdAt: '2026-04-01T00:00:00.000Z',
        updatedAt: '2026-04-01T00:00:00.000Z'
      },
      leases: [activeLease],
      tenants: [],
      bills: [
        {
          id: 'bill_rent_overdue',
          landlordOpenId: 'openid',
          leaseId: 'lease_1',
          roomId: 'room_1',
          type: 'rent',
          section: 'rent',
          dueDate: '2026-03-20',
          amount: 2800,
          status: BILL_STATUSES.pending,
          receivedAt: null,
          receivedAmount: null,
          createdAt: '2026-03-01T00:00:00.000Z',
          updatedAt: '2026-03-01T00:00:00.000Z'
        }
      ],
      now: '2026-04-01T00:00:00.000Z'
    });

    expect(summary.riskTags).toContain(BILL_RISK_TAGS.overdue);
    expect(summary.riskTags).toContain(BILL_RISK_TAGS.abnormal);
    expect(summary.overdueDays).toBeGreaterThan(0);
    expect(summary.hasAbnormal).toBe(true);
  });
});
