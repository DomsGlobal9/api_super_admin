import { baseClient } from './client';

export const auditClient = {
  list: (params?: Record<string, any>) => baseClient.get<any>('/audit-logs', params),
};
