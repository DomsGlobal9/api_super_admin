import { baseClient } from './client';

export const modulesClient = {
  list: (params?: Record<string, any>) => baseClient.get<any>('/modules', params),
  getById: (id: string) => baseClient.get<any>(`/modules/${id}`),
};
