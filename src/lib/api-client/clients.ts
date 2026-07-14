import { baseClient } from './client';

export const clientsApi = {
  list: (params?: Record<string, any>) => baseClient.get<any>('/clients', params),
  getOverview: (id: string) => baseClient.get<any>(`/clients/${id}`),
  create: (data: any) => baseClient.post<any>('/clients', data),
  update: (id: string, data: any) => baseClient.patch<any>(`/clients/${id}`, data),
  assignModule: (id: string, moduleId: string) => baseClient.post<any>(`/clients/${id}/modules`, { moduleId }),
};
