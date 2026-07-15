import { baseClient } from './client';

export const apikeysClient = {
  list: (params?: Record<string, any>) => baseClient.get<any>('/api-keys', params),
  get: (id: string) => baseClient.get<any>(`/api-keys/${id}`),
  create: (data: any) => baseClient.post<any>('/api-keys', data),
  update: (id: string, data: any) => baseClient.patch<any>(`/api-keys/${id}`, data),
  rotate: (id: string) => baseClient.post<any>(`/api-keys/${id}/rotate`),
  revoke: (id: string) => baseClient.post<any>(`/api-keys/${id}/revoke`),
  delete: (id: string) => baseClient.delete<any>(`/api-keys/${id}`),
  getAuditLogs: (id: string) => baseClient.get<any>(`/api-keys/${id}/audit`),
};
