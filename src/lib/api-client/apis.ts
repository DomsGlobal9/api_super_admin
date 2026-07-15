import { baseClient } from './client';

export const apisClient = {
  list: (params?: Record<string, any>) => baseClient.get<any>('/apis', params),
  getOverview: (id: string) => baseClient.get<any>(`/apis/${id}/overview`),
  getEndpoints: (id: string) => baseClient.get<any>(`/apis/${id}/endpoints`),
  createEndpoint: (id: string, data: any) => baseClient.post<any>(`/apis/${id}/endpoints`, data),
  createApi: (data: any) => baseClient.post<any>('/apis', data),
  updateApi: (id: string, data: any) => baseClient.patch<any>(`/apis/${id}`, data),
};
