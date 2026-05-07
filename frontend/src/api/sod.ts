import apiClient from './client';
import type { SoDRule, SoDRuleDetail, Conflict } from '@/types';

export const sodApi = {
    // Rules
    listRules: async (isActive: boolean = true): Promise<SoDRule[]> => {
        const response = await apiClient.get<SoDRule[]>('/api/sod-rules', {
            params: { is_active: isActive },
        });
        return response.data;
    },

    getRule: async (id: string): Promise<SoDRuleDetail> => {
        const response = await apiClient.get<SoDRuleDetail>(`/api/sod-rules/${id}`);
        return response.data;
    },

    createRule: async (data: Partial<SoDRuleDetail>): Promise<SoDRule> => {
        const response = await apiClient.post<SoDRule>('/api/sod-rules', data);
        return response.data;
    },

    updateRule: async (id: string, data: Partial<SoDRule>): Promise<SoDRule> => {
        const response = await apiClient.put<SoDRule>(`/api/sod-rules/${id}`, data);
        return response.data;
    },

    // Conflicts
    listConflicts: async (auditId: string, params?: {
        severity?: string;
        min_risk_score?: number;
        user_id?: string;
        rule_id?: string;
    }): Promise<Conflict[]> => {
        const response = await apiClient.get<Conflict[]>(`/api/audits/${auditId}/conflicts`, {
            params,
        });
        return response.data;
    },
};
