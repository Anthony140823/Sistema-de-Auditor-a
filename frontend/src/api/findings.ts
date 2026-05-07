import apiClient from './client';
import type { Finding, FindingComment, EvidenceFileResponse } from '@/types';

export const findingsApi = {
    list: async (auditId?: string): Promise<Finding[]> => {
        const response = await apiClient.get<Finding[]>('/api/findings', {
            params: { audit_id: auditId },
        });
        return response.data;
    },

    get: async (id: string): Promise<Finding> => {
        const response = await apiClient.get<Finding>(`/api/findings/${id}`);
        return response.data;
    },

    create: async (data: Partial<Finding>): Promise<Finding> => {
        const response = await apiClient.post<Finding>('/api/findings', data);
        return response.data;
    },

    update: async (id: string, data: Partial<Finding>): Promise<Finding> => {
        const response = await apiClient.put<Finding>(`/api/findings/${id}`, data);
        return response.data;
    },

    // Comments
    listComments: async (findingId: string): Promise<FindingComment[]> => {
        const response = await apiClient.get<FindingComment[]>(`/api/findings/${findingId}/comments`);
        return response.data;
    },

    addComment: async (findingId: string, text: string): Promise<FindingComment> => {
        const response = await apiClient.post<FindingComment>(
            `/api/findings/${findingId}/comments`,
            { comment_text: text }
        );
        return response.data;
    },

    listEvidence: async (findingId: string): Promise<EvidenceFileResponse[]> => {
        const response = await apiClient.get<EvidenceFileResponse[]>(`/api/findings/${findingId}/evidence`);
        return response.data;
    },

    uploadEvidence: async (findingId: string, file: File): Promise<EvidenceFileResponse> => {
        const formData = new FormData();
        formData.append('file', file);
        const response = await apiClient.post<EvidenceFileResponse>(
            `/api/findings/${findingId}/evidence`,
            formData,
            { headers: { 'Content-Type': 'multipart/form-data' } }
        );
        return response.data;
    },

    getEvidenceBlob: async (findingId: string, evidenceId: string): Promise<Blob> => {
        const response = await apiClient.get<Blob>(
            `/api/findings/${findingId}/evidence/${evidenceId}/content`,
            { responseType: 'blob' }
        );
        return response.data;
    },
};
