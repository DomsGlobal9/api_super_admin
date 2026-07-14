import { baseClient } from './client';

export const gatewayClient = {
  getOverview: () => baseClient.get<any>('/gateway/overview'),
  getInstances: () => baseClient.get<any>('/gateway/instances'),
  getCache: () => baseClient.get<any>('/gateway/cache'),
};
