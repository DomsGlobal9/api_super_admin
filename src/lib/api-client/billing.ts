import { baseClient } from './client';

export const billingApi = {
  getClient: (clientId: string, month?: string) => baseClient.get<any>(`/clients/${clientId}/billing`, { month }),
  saveSettings: (clientId: string, data: { monthlyLimitRupees?: string | null; gstEnabled?: boolean }) =>
    baseClient.patch<any>(`/clients/${clientId}/billing/settings`, data),
  addClientPrice: (clientId: string, data: { kind: string; amountRupees: string; effectiveFrom?: string }) =>
    baseClient.post<any>(`/clients/${clientId}/billing/prices`, data),
  makeBill: (clientId: string, month: string) => baseClient.post<any>(`/clients/${clientId}/billing/bills`, { month }),
  setBillStatus: (clientId: string, billId: string, status: string) =>
    baseClient.patch<any>(`/clients/${clientId}/billing/bills/${billId}`, { status }),
  csvUrl: (clientId: string, month: string) => `/api/admin/v1/clients/${clientId}/billing/usage-csv?month=${month}`,
  pdfUrl: (clientId: string, billId: string) => `/api/admin/v1/clients/${clientId}/billing/bills/${billId}/pdf`,

  getPlanPrices: () => baseClient.get<any>('/billing/prices'),
  addPlanPrice: (data: { plan: string; kind: string; amountRupees: string; effectiveFrom?: string }) =>
    baseClient.post<any>('/billing/prices', data),
  getBills: (month: string) => baseClient.get<any>('/billing/bills', { month }),
  makeBills: (month: string) => baseClient.post<any>('/billing/bills', { month }),
};
