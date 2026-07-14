import { baseClient } from './client';

export const healthClient = {
  getStatus: () => baseClient.get<any>('/health'),
};
