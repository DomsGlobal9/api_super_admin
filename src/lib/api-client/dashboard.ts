import { baseClient } from './client';
// import { DashboardDTO } from '@/shared/dto'; // Wait until shared is fully populated

export const dashboardApi = {
  getOverview: () => baseClient.get<any>('/dashboard'),
};
