import { baseClient } from './client';

export const clientsApi = {
  list: (params?: Record<string, any>) => baseClient.get<any>('/clients', params),
  getOverview: (id: string) => baseClient.get<any>(`/clients/${id}`),
  create: (data: any) => baseClient.post<any>('/clients', data),
  update: (id: string, data: any) => baseClient.patch<any>(`/clients/${id}`, data),
  assignApi: (id: string, apiId: string) => baseClient.post<any>(`/clients/${id}/apis`, { apiId }),
  getUsage: (id: string, params?: Record<string, any>) => baseClient.get<any>(`/clients/${id}/usage`, params),
  getRequests: (id: string, params?: Record<string, any>) => baseClient.get<any>(`/clients/${id}/requests`, params),
  getAuditLogs: (id: string) => baseClient.get<any>(`/clients/${id}/audit`),
};
