import { baseClient } from './client';

export const settingsApi = {
  get: () => baseClient.get<any>('/settings'),
  update: (data: Record<string, any>) => baseClient.patch<any>('/settings', data),
};
