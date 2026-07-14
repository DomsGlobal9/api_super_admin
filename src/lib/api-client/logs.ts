import { baseClient } from './client';

export const logsClient = {
  list: (params?: Record<string, any>) => baseClient.get<any>('/logs', params),
};
