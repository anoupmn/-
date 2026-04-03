import { callCloudFunction } from './cloud';

export type AlertListItem = {
  id: string;
  roomId: string;
  type: string;
  title: string;
  summary: string;
  reason: string;
  actionTarget: {
    page: 'units' | 'unit-detail';
    query: Record<string, string>;
  };
};

export type AlertGroup = {
  type: string;
  label: string;
  items: AlertListItem[];
};

export function listAlertGroups() {
  return callCloudFunction<{ groups: AlertGroup[] }>('alerts-list');
}
