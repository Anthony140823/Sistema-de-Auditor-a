import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { auditsApi } from '@/api/audits';
import { reportsApi } from '@/api/reports';
import { dashboardApi } from '@/api/dashboard';

export default function ReportsPage() {
    const [auditId, setAuditId] = useState('');
    const { data: audits = [] } = useQuery({
        queryKey: ['audits'],
        queryFn: auditsApi.list,
    });
    const selected = audits.find(a => a.id === auditId);
    const excelMutation = useMutation({
        mutationFn: (id: string) => reportsApi.exportConflictsExcel(id),
    });
    const pdfMutation = useMutation({
        mutationFn: (id: string) => reportsApi.exportExecutivePdf(id),
    });

    const { data: stats } = useQuery({
        queryKey: ['dashboard-summary', auditId],
        queryFn: () => dashboardApi.summary(auditId),
        enabled: !!auditId,
    });

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Reportes</h1>
                <p className="text-gray-600 mt-1">Generación de reportes ejecutivos PDF y Excel</p>
            </div>

            <div className="card">
                <div className="card-body space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-2">Seleccionar auditoría</label>
                        <select className="input max-w-xl" value={auditId} onChange={(e) => setAuditId(e.target.value)}>
                            <option value="">Seleccione</option>
                            {audits.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                        </select>
                    </div>
                    {selected && (
                        <div className="flex gap-3">
                            <button className="btn btn-primary" onClick={() => pdfMutation.mutate(selected.id)}>
                                Descargar PDF Ejecutivo
                            </button>
                            <button className="btn btn-secondary" onClick={() => excelMutation.mutate(selected.id)}>
                                Exportar Conflictos Excel
                            </button>
                        </div>
                    )}
                    {(excelMutation.isError || pdfMutation.isError) && (
                        <p className="text-danger-600 text-sm">No se pudo descargar un reporte.</p>
                    )}
                </div>
            </div>

            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="card"><div className="card-body"><p className="text-sm text-gray-600">Usuarios</p><p className="text-2xl font-bold">{stats.total_users}</p></div></div>
                    <div className="card"><div className="card-body"><p className="text-sm text-gray-600">Conflictos</p><p className="text-2xl font-bold">{stats.total_conflicts}</p></div></div>
                    <div className="card"><div className="card-body"><p className="text-sm text-gray-600">Hallazgos abiertos</p><p className="text-2xl font-bold">{stats.findings_by_status.OPEN + stats.findings_by_status.IN_REVIEW}</p></div></div>
                </div>
            )}
        </div>
    );
}
