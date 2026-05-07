import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { auditsApi } from '@/api/audits';
import { useNavigate } from 'react-router-dom';
import { Plus, Eye, Trash2 } from 'lucide-react';

export default function AuditList() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const { data: audits, isLoading } = useQuery({
        queryKey: ['audits'],
        queryFn: auditsApi.list,
    });

    const deleteMutation = useMutation({
        mutationFn: auditsApi.delete,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['audits'] });
        },
    });

    const handleDelete = async (id: string) => {
        if (confirm('¿Está seguro de eliminar esta auditoría?')) {
            await deleteMutation.mutateAsync(id);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Auditorías</h1>
                    <p className="text-gray-600 mt-1">
                        Gestión de proyectos de auditoría
                    </p>
                </div>
                <button
                    onClick={() => navigate('/audits/create')}
                    className="btn btn-primary flex items-center gap-2"
                >
                    <Plus size={20} />
                    Nueva Auditoría
                </button>
            </div>

            {/* Audits Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {audits?.map((audit) => (
                    <div key={audit.id} className="card hover:shadow-lg transition-shadow">
                        <div className="card-body">
                            <div className="flex items-start justify-between mb-4">
                                <h3 className="text-lg font-semibold text-gray-900">
                                    {audit.name}
                                </h3>
                            </div>

                            <div className="space-y-2 text-sm text-gray-600 mb-4">
                                <p>
                                    <span className="font-medium">Empresa:</span> {audit.company_name}
                                </p>
                                <p>
                                    <span className="font-medium">Periodo:</span>{' '}
                                    {new Date(audit.period_start).toLocaleDateString()} -{' '}
                                    {new Date(audit.period_end).toLocaleDateString()}
                                </p>
                            </div>

                            <div className="flex gap-2">
                                <button
                                    onClick={() => navigate(`/audits/${audit.id}`)}
                                    className="btn btn-primary flex-1 flex items-center justify-center gap-2"
                                >
                                    <Eye size={16} />
                                    Ver Detalles
                                </button>
                                <button
                                    onClick={() => handleDelete(audit.id)}
                                    className="btn btn-danger px-3"
                                    title="Eliminar"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {audits?.length === 0 && (
                <div className="card">
                    <div className="card-body text-center py-12">
                        <p className="text-gray-500 mb-4">No hay auditorías creadas</p>
                        <button
                            onClick={() => navigate('/audits/create')}
                            className="btn btn-primary"
                        >
                            Crear Primera Auditoría
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
