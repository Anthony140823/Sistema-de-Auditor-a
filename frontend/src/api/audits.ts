import apiClient from './client';
import type { Audit, ImportValidationResult, ConflictDetectionResponse, ImportStatus, ConflictDetectionProgress } from '@/types';

export const auditsApi = {
    list: async (): Promise<Audit[]> => {
        const response = await apiClient.get<Audit[]>('/api/audits');
        return response.data;
    },

    get: async (id: string): Promise<Audit> => {
        const response = await apiClient.get<Audit>(`/api/audits/${id}`);
        return response.data;
    },

    create: async (data: Partial<Audit>): Promise<Audit> => {
        const response = await apiClient.post<Audit>('/api/audits', data);
        return response.data;
    },

    update: async (id: string, data: Partial<Audit>): Promise<Audit> => {
        const response = await apiClient.put<Audit>(`/api/audits/${id}`, data);
        return response.data;
    },

    delete: async (id: string): Promise<void> => {
        await apiClient.delete(`/api/audits/${id}`);
    },

    // Import endpoints
    importUsers: async (auditId: string, file: File): Promise<ImportValidationResult> => {
        const formData = new FormData();
        formData.append('file', file);
        const response = await apiClient.post<ImportValidationResult>(
            `/api/audits/${auditId}/import/users`,
            formData,
            {
                headers: { 'Content-Type': 'multipart/form-data' },
            }
        );
        return response.data;
    },

    importUserRoles: async (auditId: string, file: File): Promise<ImportValidationResult> => {
        const formData = new FormData();
        formData.append('file', file);
        const response = await apiClient.post<ImportValidationResult>(
            `/api/audits/${auditId}/import/user-roles`,
            formData,
            {
                headers: { 'Content-Type': 'multipart/form-data' },
            }
        );
        return response.data;
    },

    importRoleTCodes: async (auditId: string, file: File): Promise<ImportValidationResult> => {
        const formData = new FormData();
        formData.append('file', file);
        const response = await apiClient.post<ImportValidationResult>(
            `/api/audits/${auditId}/import/role-tcodes`,
            formData,
            {
                headers: { 'Content-Type': 'multipart/form-data' },
            }
        );
        return response.data;
    },

    getImportStatus: async (auditId: string): Promise<ImportStatus> => {
        const response = await apiClient.get<ImportStatus>(`/api/audits/${auditId}/import/status`);
        return response.data;
    },

    // Conflict detection
    detectConflicts: async (auditId: string): Promise<ConflictDetectionResponse> => {
        const response = await apiClient.post<ConflictDetectionResponse>(
            `/api/audits/${auditId}/detect-conflicts`,
            {}
        );
        return response.data;
    },

    getDetectProgress: async (auditId: string): Promise<ConflictDetectionProgress> => {
        const response = await apiClient.get<ConflictDetectionProgress>(`/api/audits/${auditId}/detect-progress`);
        return response.data;
    },
};
