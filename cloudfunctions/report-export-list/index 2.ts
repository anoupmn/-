import { listReportExports } from './shared/repositories/report-export-repository';
import { resolveDb, resolveLandlordOpenId, type CloudEventBase } from './shared/runtime';

export async function main(event: CloudEventBase = {}) {
  const db = resolveDb(event);
  const landlordOpenId = resolveLandlordOpenId(event);

  return {
    exports: await listReportExports(db, landlordOpenId)
  };
}
