import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL + '/api',
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export const aiApi = {
    getMitigationPlan: async (conflictId: string): Promise<string> => {
        const { data } = await api.post(`/ai/mitigation/${conflictId}`);
        return data.content;
    },
    
    getExecutiveSummary: async (auditId: string): Promise<string> => {
        const { data } = await api.post(`/ai/summary/${auditId}`);
        return data.content;
    }
};
