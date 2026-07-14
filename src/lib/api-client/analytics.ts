import { baseClient } from './client';

export const analyticsClient = {
  getUsage: (params?: Record<string, any>) => baseClient.get<any>('/analytics', params),
};
