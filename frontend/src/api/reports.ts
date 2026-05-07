import apiClient from './client';

function saveBlob(blob: Blob, filename: string) {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
}

export const reportsApi = {
    exportConflictsExcel: async (auditId: string): Promise<void> => {
        const response = await apiClient.get(`/api/audits/${auditId}/reports/conflicts.xlsx`, {
            responseType: 'blob',
        });
        saveBlob(response.data, `conflicts_${auditId}.xlsx`);
    },

    exportExecutivePdf: async (auditId: string): Promise<void> => {
        const response = await apiClient.get(`/api/audits/${auditId}/reports/executive.pdf`, {
            responseType: 'blob',
        });
        saveBlob(response.data, `executive_report_${auditId}.pdf`);
    },
};
