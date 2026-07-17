import apiClient from './client';

export interface GomezitoAgentRequest {
    message: string;
    context: {
        pathname: string;
        page_help: string;
        pending_action?: string | null;
        known_audit_id?: string | null;
    };
    recent_messages: Array<{
        sender: 'gomezito' | 'user';
        text: string;
    }>;
}

export interface GomezitoAgentResponse {
    reply: string;
    action: {
        type: 'none' | 'navigate' | 'create_audit' | 'download_report' | 'list_audits' | 'explain_current_page' | 'detect_conflicts' | 'create_findings_from_conflicts' | 'summarize_current_audit';
        target?: string | null;
        data?: Record<string, unknown>;
    };
}

export const aiApi = {
    getMitigationPlan: async (conflictId: string): Promise<string> => {
        const { data } = await apiClient.post(`/api/ai/mitigation/${conflictId}`);
        return data.content;
    },
    
    getExecutiveSummary: async (auditId: string): Promise<string> => {
        const { data } = await apiClient.post(`/api/ai/summary/${auditId}`);
        return data.content;
    },

    askGomezito: async (payload: GomezitoAgentRequest): Promise<GomezitoAgentResponse> => {
        const { data } = await apiClient.post<GomezitoAgentResponse>('/api/ai/gomezito', payload);
        return data;
    },
};
