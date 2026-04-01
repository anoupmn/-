import { assertSingleActiveLease, closeLeaseAndDeriveUnitStatus, deriveLeaseStatus } from '../../cloudfunctions/shared/calculators/lease-lifecycle';
import { LEASE_STATUSES, UNIT_STATUSES } from '../../cloudfunctions/shared/constants/statuses';

const activeLease = {
  id: 'lease_active',
  landlordOpenId: 'openid',
  roomId: 'room_1',
  tenantId: 'tenant_1',
  startDate: '2026-03-01',
  endDate: '2026-04-30',
  billingCycleDays: 30,
  rentAmount: 2000,
  depositAmount: 1000,
  note: '',
  closedAt: null,
  createdAt: '2026-03-01T00:00:00.000Z',
  updatedAt: '2026-03-01T00:00:00.000Z'
};

describe('lease lifecycle', () => {
  it('derives future lease status correctly', () => {
    expect(
      deriveLeaseStatus(
        {
          ...activeLease,
          startDate: '2026-05-01',
          endDate: '2026-06-30'
        },
        '2026-04-01T00:00:00.000Z'
      )
    ).toBe(LEASE_STATUSES.future);
  });

  it('blocks a second active lease for the same room but allows future lease', () => {
    expect(() =>
      assertSingleActiveLease(
        [activeLease],
        {
          ...activeLease,
          id: 'lease_conflict',
          tenantId: 'tenant_2'
        },
        '2026-04-01T00:00:00.000Z'
      )
    ).toThrow('A room can only have one active lease at a time.');

    expect(() =>
      assertSingleActiveLease(
        [activeLease],
        {
          ...activeLease,
          id: 'future lease',
          tenantId: 'tenant_2',
          startDate: '2026-05-01',
          endDate: '2026-06-30'
        },
        '2026-04-01T00:00:00.000Z'
      )
    ).not.toThrow();
  });

  it('closes lease and derives pending_move_in when a future lease exists', () => {
    const result = closeLeaseAndDeriveUnitStatus(
      activeLease,
      [
        activeLease,
        {
          ...activeLease,
          id: 'lease_future',
          tenantId: 'tenant_3',
          startDate: '2026-05-01',
          endDate: '2026-08-31'
        }
      ],
      '2026-04-15T00:00:00.000Z'
    );

    expect(result.closedLease.closedAt).toBe('2026-04-15T00:00:00.000Z');
    expect(result.currentStatus).toBe(UNIT_STATUSES.pendingMoveIn);
  });
});
