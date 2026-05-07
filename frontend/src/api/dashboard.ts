import apiClient from './client';
import type { DashboardStats } from '@/types';

export const dashboardApi = {
    summary: async (auditId: string): Promise<DashboardStats> => {
        const response = await apiClient.get<DashboardStats>('/api/dashboard/summary', {
            params: { audit_id: auditId },
        });
        return response.data;
    },
};

