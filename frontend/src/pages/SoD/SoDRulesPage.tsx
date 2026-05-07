import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Eye } from 'lucide-react';
import { sodApi } from '@/api/sod';

export default function SoDRulesPage() {
    const queryClient = useQueryClient();
    const { data: rules = [] } = useQuery({
        queryKey: ['sod-rules'],
        queryFn: () => sodApi.listRules(true),
    });

    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [severity, setSeverity] = useState<'HIGH' | 'MEDIUM' | 'LOW'>('MEDIUM');
    const [riskBase, setRiskBase] = useState(60);
    const [setA, setSetA] = useState('ME21N,ME22N');
    const [setB, setSetB] = useState('F110,F-53');
    const [descriptionModal, setDescriptionModal] = useState<{ title: string; description: string } | null>(null);

    const createMutation = useMutation({
        mutationFn: () =>
            sodApi.createRule({
                name,
                description,
                severity,
                risk_base_score: riskBase,
                is_active: true,
                set_a_tcodes: setA.split(',').map((t) => t.trim()).filter(Boolean),
                set_b_tcodes: setB.split(',').map((t) => t.trim()).filter(Boolean),
            }),
        onSuccess: () => {
            setName('');
            setDescription('');
            queryClient.invalidateQueries({ queryKey: ['sod-rules'] });
        },
    });

    return (
        <div className="space-y-6">
            {descriptionModal && (
                <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
                    <div className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white shadow-xl">
                        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                            <h3 className="text-lg font-semibold text-slate-900">{descriptionModal.title}</h3>
                            <button className="btn btn-secondary" onClick={() => setDescriptionModal(null)}>
                                Cerrar
                            </button>
                        </div>
                        <div className="px-5 py-4">
                            <p className="text-sm text-slate-700 whitespace-pre-wrap">{descriptionModal.description || 'Sin descripcion'}</p>
                        </div>
                    </div>
                </div>
            )}

            <div>
                <h1 className="text-3xl font-bold text-gray-900">Reglas SoD</h1>
                <p className="text-gray-600 mt-1">Definicion de reglas de segregacion de funciones</p>
            </div>

            <div className="card">
                <div className="card-header">
                    <h3 className="text-lg font-semibold">Crear Regla</h3>
                </div>
                <div className="card-body grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Nombre de regla</label>
                        <input className="input" placeholder="Ej. Crear proveedor + Pagar proveedor" value={name} onChange={(e) => setName(e.target.value)} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Severidad</label>
                        <select className="input" value={severity} onChange={(e) => setSeverity(e.target.value as any)}>
                            <option value="HIGH">Alta</option>
                            <option value="MEDIUM">Media</option>
                            <option value="LOW">Baja</option>
                        </select>
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium mb-1">Descripcion</label>
                        <input
                            className="input"
                            placeholder="Describe por que esta combinacion representa conflicto SoD"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Riesgo base (0-100)</label>
                        <input className="input" type="number" min={0} max={100} value={riskBase} onChange={(e) => setRiskBase(Number(e.target.value))} />
                        <p className="text-xs text-gray-500 mt-1">Valor inicial para calcular el Risk Score del conflicto.</p>
                    </div>
                    <div />
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium mb-1">Set A (TCodes)</label>
                        <input className="input" placeholder="ME21N,ME22N" value={setA} onChange={(e) => setSetA(e.target.value)} />
                        <p className="text-xs text-gray-500 mt-1">Lista separada por comas. El usuario debe tener al menos 1 TCode de este set.</p>
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium mb-1">Set B (TCodes)</label>
                        <input className="input" placeholder="F110,F-53" value={setB} onChange={(e) => setSetB(e.target.value)} />
                        <p className="text-xs text-gray-500 mt-1">Lista separada por comas. Si tambien tiene 1 TCode de este set, se genera conflicto.</p>
                    </div>
                    <button className="btn btn-primary md:col-span-2" onClick={() => createMutation.mutate()} disabled={createMutation.isPending || !name}>
                        {createMutation.isPending ? 'Guardando...' : 'Guardar Regla'}
                    </button>
                </div>
            </div>

            <div className="card">
                <div className="card-header">
                    <h3 className="text-lg font-semibold">Listado de Reglas</h3>
                </div>
                <div className="card-body p-0 overflow-x-auto">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Nombre</th>
                                <th>Severidad</th>
                                <th>Riesgo Base</th>
                                <th>Descripcion</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rules.map((rule) => (
                                <tr key={rule.id}>
                                    <td>{rule.name}</td>
                                    <td>{rule.severity}</td>
                                    <td>{rule.risk_base_score}</td>
                                    <td>
                                        <div className="flex items-center gap-2 max-w-[360px]">
                                            <span className="truncate text-sm text-gray-700">{rule.description || 'Sin descripcion'}</span>
                                            <button
                                                className="btn btn-secondary px-2 py-1"
                                                title="Ver descripcion completa"
                                                onClick={() =>
                                                    setDescriptionModal({
                                                        title: rule.name,
                                                        description: rule.description || 'Sin descripcion',
                                                    })
                                                }
                                            >
                                                <Eye size={14} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
