import { main as leasesEndMain } from '../../cloudfunctions/leases-end/index';
import { getWXContext } from '../helpers/mock-cloud';

type LeaseRecord = {
  _id: string;
  id: string;
  roomId: string;
  tenantId: string;
  startDate: string;
  endDate: string;
  billingCycleDays: number;
  rentAmount: number;
  depositAmount: number;
  note: string;
  landlordOpenId: string;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

function createLeasesOnlyDb(leases: LeaseRecord[]) {
  return {
    collection(name: string) {
      if (name !== 'leases') {
        throw new Error(`Unexpected collection ${name}`);
      }

      return {
        where(query: Record<string, unknown>) {
          return {
            get: async () => ({
              data: leases.filter((lease) =>
                Object.entries(query).every(([key, value]) => (lease as Record<string, unknown>)[key] === value)
              )
            }),
            update: async ({ data }: { data: Partial<LeaseRecord> }) => {
              const matches = leases.filter((lease) =>
                Object.entries(query).every(([key, value]) => (lease as Record<string, unknown>)[key] === value)
              );
              matches.forEach((lease) => Object.assign(lease, data));
              return { stats: { updated: matches.length } };
            },
            remove: async () => ({ stats: { removed: 0 } })
          };
        },
        doc(id: string) {
          return {
            get: async () => ({ data: null }),
            update: async ({ data }: { data: Partial<LeaseRecord> }) => {
              const target = leases.find((item) => item._id === id);

              if (!target) {
                throw new Error(`document with _id ${id} does not exist`);
              }

              Object.assign(target, data);
              return { stats: { updated: 1 } };
            },
            remove: async () => ({ stats: { removed: 0 } })
          };
        },
        get: async () => ({ data: leases }),
        add: async () => ({ _id: 'unused' })
      };
    }
  };
}

describe('leases-end cloud function', () => {
  it('updates lease by _id and closes duplicate active leases of the same room', async () => {
    const leases: LeaseRecord[] = [
      {
        _id: 'db_lease_a',
        id: 'lease_a',
        landlordOpenId: 'openid_test',
        roomId: 'room_1',
        tenantId: 'tenant_1',
        startDate: '2026-01-01',
        endDate: '2026-12-31',
        billingCycleDays: 30,
        rentAmount: 3200,
        depositAmount: 3200,
        note: '',
        closedAt: null,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z'
      },
      {
        _id: 'db_lease_b',
        id: 'lease_b',
        landlordOpenId: 'openid_test',
        roomId: 'room_1',
        tenantId: 'tenant_2',
        startDate: '2026-02-01',
        endDate: '2026-12-31',
        billingCycleDays: 30,
        rentAmount: 3300,
        depositAmount: 3300,
        note: '',
        closedAt: null,
        createdAt: '2026-02-01T00:00:00.000Z',
        updatedAt: '2026-02-01T00:00:00.000Z'
      },
      {
        _id: 'db_lease_future',
        id: 'lease_future',
        landlordOpenId: 'openid_test',
        roomId: 'room_1',
        tenantId: 'tenant_3',
        startDate: '2026-05-01',
        endDate: '2027-04-30',
        billingCycleDays: 30,
        rentAmount: 3500,
        depositAmount: 3500,
        note: '',
        closedAt: null,
        createdAt: '2026-03-20T00:00:00.000Z',
        updatedAt: '2026-03-20T00:00:00.000Z'
      }
    ];
    const now = '2026-04-15T00:00:00.000Z';

    const result = await leasesEndMain({
      leaseId: 'lease_a',
      __mockDb: createLeasesOnlyDb(leases) as any,
      __mockContext: { getWXContext: () => getWXContext('openid_test') },
      now
  it('supports settlement parameter without breaking backward compatibility', async () => {
    const leases: LeaseRecord[] = [
      {
        _id: 'db_lease_s',
        id: 'lease_s',
        landlordOpenId: 'openid_test',
        roomId: 'room_1',
        tenantId: 'tenant_1',
        startDate: '2026-01-01',
        endDate: '2026-12-31',
        billingCycleDays: 30,
        rentAmount: 3200,
        depositAmount: 3200,
        note: '',
        closedAt: null,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z'
      }
    ];
    const now = '2026-04-15T00:00:00.000Z';

    const result = await leasesEndMain({
      leaseId: 'lease_s',
      settlement: {
        voidFutureSystemBills: true,
        refundDeposit: true
      },
      __mockDb: createLeasesOnlyDb(leases) as any,
      __mockContext: { getWXContext: () => getWXContext('openid_test') },
      now
    });

    expect(result.lease.closedAt).toBe(now);
    expect(leases.find((item) => item.id === 'lease_s')?.closedAt).toBe(now);
  });

  it('endLease without settlement preserves backward compatibility', async () => {
    const leases: LeaseRecord[] = [
      {
        _id: 'db_lease_t',
        id: 'lease_t',
        landlordOpenId: 'openid_test',
        roomId: 'room_2',
        tenantId: 'tenant_2',
        startDate: '2026-01-01',
        endDate: '2026-12-31',
        billingCycleDays: 30,
        rentAmount: 3000,
        depositAmount: 3000,
        note: '',
        closedAt: null,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z'
      }
    ];
    const now = '2026-05-01T00:00:00.000Z';

    const result = await leasesEndMain({
      leaseId: 'lease_t',
      __mockDb: createLeasesOnlyDb(leases) as any,
      __mockContext: { getWXContext: () => getWXContext('openid_test') },
      now
    });

    expect(result.lease.closedAt).toBe(now);
    expect(result.unpaidBillSummary).toBeDefined();
    expect(leases.find((item) => item.id === 'lease_t')?.closedAt).toBe(now);
  });
});

    expect(result.currentStatus).toBe('pending_move_in');
    expect(result.lease.closedAt).toBe(now);
    expect(leases.find((item) => item.id === 'lease_a')?.closedAt).toBe(now);
    expect(leases.find((item) => item.id === 'lease_b')?.closedAt).toBe(now);
    expect(leases.find((item) => item.id === 'lease_future')?.closedAt).toBeNull();
  });

  it('rejects closing lease from another landlord', async () => {
    const leases: LeaseRecord[] = [
      {
        _id: 'db_lease_a',
        id: 'lease_a',
        landlordOpenId: 'openid_test',
        roomId: 'room_1',
        tenantId: 'tenant_1',
        startDate: '2026-01-01',
        endDate: '2026-12-31',
        billingCycleDays: 30,
        rentAmount: 3200,
        depositAmount: 3200,
        note: '',
        closedAt: null,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z'
      }
    ];

    await expect(
      leasesEndMain({
        leaseId: 'lease_a',
        __mockDb: createLeasesOnlyDb(leases) as any,
        __mockContext: { getWXContext: () => getWXContext('openid_other') },
        now: '2026-04-15T00:00:00.000Z'
      })
    ).rejects.toThrow('Lease lease_a not found.');
  });
});
