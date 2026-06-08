import apiClient from './client';

export const aiApi = {
    getMitigationPlan: async (conflictId: string): Promise<string> => {
        const { data } = await apiClient.post(`/api/ai/mitigation/${conflictId}`);
        return data.content;
    },
    
    getExecutiveSummary: async (auditId: string): Promise<string> => {
        const { data } = await apiClient.post(`/api/ai/summary/${auditId}`);
        return data.content;
    }
};
