import { deriveBillStatus, getUpcomingDueWindowDays, isBillOverdueTrackable } from '../../cloudfunctions/shared/calculators/bill-status';
import { BILL_STATUSES } from '../../cloudfunctions/shared/constants/statuses';
import { billSchema } from '../../cloudfunctions/shared/schemas/bill';

describe('bill status', () => {
  const baseBill = billSchema.parse({
    id: 'bill_1',
    landlordOpenId: 'openid',
    leaseId: 'lease_1',
    roomId: 'room_1',
    type: 'rent',
    section: 'rent',
    dueDate: '2026-04-10',
    amount: 2800,
    status: BILL_STATUSES.pending,
    receivedAt: null,
    receivedAmount: null,
    createdAt: '2026-04-01T00:00:00.000Z',
    updatedAt: '2026-04-01T00:00:00.000Z'
  });

  it('derives due_today, paid, and overdue states for normal receivables', () => {
    expect(deriveBillStatus(baseBill, '2026-04-08T00:00:00.000Z')).toBe(BILL_STATUSES.pending);
    expect(deriveBillStatus(baseBill, '2026-04-10T00:00:00.000Z')).toBe(BILL_STATUSES.dueToday);
    expect(
      deriveBillStatus(
        {
          ...baseBill,
          receivedAt: '2026-04-10T09:00:00.000Z',
          receivedAmount: 2800
        },
        '2026-04-11T00:00:00.000Z'
      )
    ).toBe(BILL_STATUSES.paid);
    expect(deriveBillStatus(baseBill, '2026-04-12T00:00:00.000Z')).toBe(BILL_STATUSES.overdue);
  });

  it('treats deposit as non-overdue even after due date', () => {
    const depositBill = {
      ...baseBill,
      id: 'bill_deposit',
      type: 'deposit' as const,
      section: 'deposit' as const
    };

    expect(isBillOverdueTrackable(depositBill)).toBe(false);
    expect(deriveBillStatus(depositBill, '2026-04-20T00:00:00.000Z')).toBe(BILL_STATUSES.pending);
  });

  it('returns a fixed 15-day upcoming due window', () => {
    expect(getUpcomingDueWindowDays()).toBe(15);
  });
});
