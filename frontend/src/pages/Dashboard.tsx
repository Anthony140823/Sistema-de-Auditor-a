import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { auditsApi } from '@/api/audits';
import { dashboardApi } from '@/api/dashboard';
import { FolderOpen, ShieldAlert, AlertTriangle, Activity } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function Dashboard() {
    const [auditId, setAuditId] = useState('');
    const { data: audits = [] } = useQuery({
        queryKey: ['audits'],
        queryFn: auditsApi.list,
    });

    const selectedAudit = auditId || audits[0]?.id || '';
    const { data: stats } = useQuery({
        queryKey: ['dashboard-summary', selectedAudit],
        queryFn: () => dashboardApi.summary(selectedAudit),
        enabled: !!selectedAudit,
    });

    const bySeverity = [
        { name: 'Alta', value: stats?.conflicts_by_severity.HIGH || 0 },
        { name: 'Media', value: stats?.conflicts_by_severity.MEDIUM || 0 },
        { name: 'Baja', value: stats?.conflicts_by_severity.LOW || 0 },
    ];

    const findingsStatus = [
        { name: 'Abierto', value: stats?.findings_by_status.OPEN || 0 },
        { name: 'En revisión', value: stats?.findings_by_status.IN_REVIEW || 0 },
        { name: 'Aceptado', value: stats?.findings_by_status.ACCEPTED || 0 },
        { name: 'Remediado', value: stats?.findings_by_status.REMEDIATED || 0 },
        { name: 'Excepción aprobada', value: stats?.findings_by_status.EXCEPTION_APPROVED || 0 },
        { name: 'Cerrado', value: stats?.findings_by_status.CLOSED || 0 },
    ];

    const cards = [
        { name: 'Usuarios SAP', value: stats?.total_users || 0, icon: FolderOpen },
        { name: 'Usuarios Activos', value: stats?.active_users || 0, icon: Activity },
        { name: 'Conflictos SoD', value: stats?.total_conflicts || 0, icon: ShieldAlert },
        { name: 'Hallazgos Abiertos', value: (stats?.findings_by_status.OPEN || 0) + (stats?.findings_by_status.IN_REVIEW || 0), icon: AlertTriangle },
    ];

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between gap-3">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Dashboard Ejecutivo</h1>
                    <p className="text-gray-600 mt-1">Visión consolidada de riesgos SoD por auditoría</p>
                </div>
                <select className="input w-80" value={selectedAudit} onChange={(e) => setAuditId(e.target.value)}>
                    {audits.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {cards.map((c) => {
                    const Icon = c.icon;
                    return (
                        <div key={c.name} className="card">
                            <div className="card-body">
                                <p className="text-sm text-gray-600">{c.name}</p>
                                <div className="mt-2 flex items-center justify-between">
                                    <p className="text-3xl font-bold">{c.value}</p>
                                    <div className="p-2 rounded-lg bg-primary-100">
                                        <Icon className="text-primary-700" size={22} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="card">
                    <div className="card-header"><h3 className="text-lg font-semibold">Conflictos por Severidad</h3></div>
                    <div className="card-body">
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={bySeverity}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip />
                                <Bar dataKey="value" fill="#0284c7" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
                <div className="card">
                    <div className="card-header"><h3 className="text-lg font-semibold">Estado de Hallazgos</h3></div>
                    <div className="card-body">
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={findingsStatus}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip />
                                <Bar dataKey="value" fill="#0ea5e9" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
}
