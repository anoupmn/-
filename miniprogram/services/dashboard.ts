import { callCloudFunction } from './cloud';

export type DashboardOverviewCard = {
  key: string;
  label: string;
  count: number;
  query: Record<string, string>;
};

export type DashboardAbnormalRow = {
  roomId: string;
  displayName: string;
  primaryReason: string;
  supportingText: string;
  query: Record<string, string>;
};

export type DashboardRecommendation = {
  type: string;
  label: string;
  title: string;
  actionLabel: string;
  actionQuery: Record<string, string>;
} | null;

export type DashboardPayload = {
  overviewCards: DashboardOverviewCard[];
  abnormalRows: DashboardAbnormalRow[];
  recommendation: DashboardRecommendation;
  subscriptionState: {
    consentState: 'unknown' | 'accepted' | 'rejected';
    hasRequested: boolean;
    enabledRuleTypes: string[];
  };
};

export function getHomeDashboard() {
  return callCloudFunction<DashboardPayload>('dashboard-home');
}
