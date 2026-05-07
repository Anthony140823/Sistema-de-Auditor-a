import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Eye } from 'lucide-react';
import { findingsApi } from '@/api/findings';
import { auditsApi } from '@/api/audits';
import { sodApi } from '@/api/sod';
import type { Conflict } from '@/types';
import type { EvidenceFileResponse } from '@/types';

const statuses = ['OPEN', 'IN_REVIEW', 'ACCEPTED', 'REMEDIATED', 'EXCEPTION_APPROVED', 'CLOSED'] as const;
const statusLabels: Record<(typeof statuses)[number], string> = {
    OPEN: 'Abierto',
    IN_REVIEW: 'En revisión',
    ACCEPTED: 'Aceptado',
    REMEDIATED: 'Remediado',
    EXCEPTION_APPROVED: 'Excepción aprobada',
    CLOSED: 'Cerrado',
};

const statusBadgeClass = (status: (typeof statuses)[number]) => {
    if (status === 'OPEN') return 'bg-sky-50 text-sky-700 border-sky-200';
    if (status === 'IN_REVIEW') return 'bg-amber-50 text-amber-700 border-amber-200';
    if (status === 'ACCEPTED') return 'bg-violet-50 text-violet-700 border-violet-200';
    if (status === 'REMEDIATED') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (status === 'EXCEPTION_APPROVED') return 'bg-indigo-50 text-indigo-700 border-indigo-200';
    return 'bg-gray-100 text-gray-700 border-gray-200';
};

export default function FindingsPage() {
    const queryClient = useQueryClient();
    const [selectedAudit, setSelectedAudit] = useState('');
    const [selectedFindingId, setSelectedFindingId] = useState('');
    const [commentText, setCommentText] = useState('');
    const [feedback, setFeedback] = useState('');
    const [feedbackType, setFeedbackType] = useState<'success' | 'error'>('success');
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [previewName, setPreviewName] = useState<string>('');

    const { data: audits = [] } = useQuery({
        queryKey: ['audits'],
        queryFn: auditsApi.list,
    });

    const { data: findings = [] } = useQuery({
        queryKey: ['findings', selectedAudit],
        queryFn: () => findingsApi.list(selectedAudit || undefined),
    });

    const { data: conflictsForAudit = [] } = useQuery<Conflict[]>({
        queryKey: ['conflicts-for-findings', selectedAudit],
        queryFn: () => {
            if (!selectedAudit) return Promise.resolve([]);
            return sodApi.listConflicts(selectedAudit);
        },
        enabled: !!selectedAudit,
    });

    useEffect(() => {
        if (!selectedFindingId && findings.length > 0) {
            setSelectedFindingId(findings[0].id);
        } else if (selectedFindingId && !findings.some((f) => f.id === selectedFindingId)) {
            setSelectedFindingId(findings[0]?.id || '');
        }
    }, [findings, selectedFindingId]);

    const selectedFinding = useMemo(
        () => findings.find((f) => f.id === selectedFindingId),
        [findings, selectedFindingId]
    );

    const selectedConflict = useMemo(() => {
        if (!selectedFinding?.conflict_id) return null;
        return conflictsForAudit.find((c) => c.id === selectedFinding.conflict_id) || null;
    }, [conflictsForAudit, selectedFinding]);

    const severityLabel = (sev?: string) => {
        const s = String(sev || '').toUpperCase();
        if (s === 'HIGH') return 'Alto (crítico)';
        if (s === 'MEDIUM') return 'Medio (atención)';
        if (s === 'LOW') return 'Bajo (informativo)';
        return 'No especificado';
    };

    const riskMeaning = (risk?: number) => {
        const v = Number(risk);
        if (!Number.isFinite(v)) return '';
        if (v >= 80) return 'muy alto';
        if (v >= 60) return 'alto';
        if (v >= 40) return 'medio';
        return 'bajo';
    };

    const narrative = useMemo(() => {
        if (!selectedFinding) return null;

        const user = selectedConflict?.user_name || selectedConflict?.user_id || selectedConflict?.sap_user_id;
        const rule = selectedConflict?.rule_name || selectedConflict?.rule_id;
        const sev = selectedConflict?.rule_severity;
        const risk = selectedConflict?.risk_score;

        const whatIs = selectedConflict
            ? `Se detectó que el usuario ${user} tiene accesos que activan la regla “${rule}”. Esto significa que podría ejecutar funciones incompatibles dentro del proceso.`
            : `Se registró el hallazgo “${selectedFinding.title}”.`;

        const criteria = selectedConflict
            ? `La segregación de funciones exige separar tareas incompatibles. En este caso, la regla “${rule}” establece que esas actividades no deberían concentrarse en un mismo usuario.`
            : 'De acuerdo a la política de control interno y segregación de funciones, las actividades críticas deben estar separadas.';

        const effect = selectedConflict
            ? `Impacto potencial: incrementa el riesgo de fraude o errores, porque una sola persona podría completar un ciclo sin supervisión. Severidad: ${severityLabel(sev)}. Risk Score: ${risk ?? 'N/D'}${risk != null ? ` (${riskMeaning(risk)})` : ''}.`
            : 'Impacto potencial: riesgo de fraude, errores operativos o incumplimiento de controles.';

        const cause = selectedConflict
            ? 'Causa probable: asignación de roles/permisos sin revisión periódica, roles demasiado amplios o cambios de acceso sin control formal.'
            : 'Causa probable: permisos asignados sin revisión o falta de controles de segregación.';

        const recommendation = selectedConflict
            ? `Recomendación: revisar el acceso del usuario ${user} y ajustar roles para eliminar la incompatibilidad de la regla “${rule}”. Si no es posible separarlo completamente, implementar controles compensatorios (aprobación dual, revisión de logs y monitoreo).`
            : 'Recomendación: revisar roles y permisos, separar funciones incompatibles y aplicar controles compensatorios si corresponde.';

        return { whatIs, criteria, effect, cause, recommendation };
    }, [selectedFinding, selectedConflict]);

    const { data: comments = [] } = useQuery({
        queryKey: ['finding-comments', selectedFindingId],
        queryFn: () => findingsApi.listComments(selectedFindingId),
        enabled: !!selectedFindingId,
    });

    const { data: evidence = [] } = useQuery({
        queryKey: ['finding-evidence', selectedFindingId],
        queryFn: () => findingsApi.listEvidence(selectedFindingId),
        enabled: !!selectedFindingId,
    });

    const showFeedback = (type: 'success' | 'error', message: string) => {
        setFeedbackType(type);
        setFeedback(message);
        setTimeout(() => setFeedback(''), 2600);
    };

    const updateMutation = useMutation({
        mutationFn: ({ id, status }: { id: string; status: string }) => findingsApi.update(id, { status: status as any }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['findings', selectedAudit] });
            showFeedback('success', 'Estado actualizado correctamente.');
        },
        onError: () => showFeedback('error', 'No se pudo actualizar el estado.'),
    });

    const commentMutation = useMutation({
        mutationFn: ({ id, text }: { id: string; text: string }) => findingsApi.addComment(id, text),
        onSuccess: (_, vars) => {
            setCommentText('');
            queryClient.invalidateQueries({ queryKey: ['finding-comments', vars.id] });
            showFeedback('success', 'Comentario guardado correctamente.');
        },
        onError: () => showFeedback('error', 'No se pudo guardar el comentario.'),
    });

    const evidenceMutation = useMutation({
        mutationFn: ({ id, file }: { id: string; file: File }) => findingsApi.uploadEvidence(id, file),
        onSuccess: (_, vars) => {
            queryClient.invalidateQueries({ queryKey: ['finding-evidence', vars.id] });
            showFeedback('success', 'Evidencia subida correctamente.');
        },
        onError: () => showFeedback('error', 'No se pudo subir la evidencia.'),
    });

    const previewMutation = useMutation({
        mutationFn: ({ findingId, evidenceId }: { findingId: string; evidenceId: string }) =>
            findingsApi.getEvidenceBlob(findingId, evidenceId),
        onSuccess: (blob, vars) => {
            if (previewUrl) {
                URL.revokeObjectURL(previewUrl);
            }
            const url = URL.createObjectURL(blob);
            const item = evidence.find((e) => e.id === vars.evidenceId);
            setPreviewUrl(url);
            setPreviewName(item?.file_name || 'Evidencia');
        },
        onError: () => showFeedback('error', 'No se pudo abrir la evidencia.'),
    });

    useEffect(() => {
        return () => {
            if (previewUrl) {
                URL.revokeObjectURL(previewUrl);
            }
        };
    }, [previewUrl]);

    const isImageFile = (e: EvidenceFileResponse) => {
        const name = e.file_name.toLowerCase();
        return name.endsWith('.png') || name.endsWith('.jpg') || name.endsWith('.jpeg') || name.endsWith('.gif') || name.endsWith('.webp') || name.endsWith('.bmp');
    };

    return (
        <div className="space-y-6">
            {feedback && (
                <div className={`fixed top-4 right-4 z-50 rounded-md border px-4 py-3 text-sm shadow-lg ${
                    feedbackType === 'success'
                        ? 'border-green-200 bg-green-50 text-green-800'
                        : 'border-red-200 bg-red-50 text-red-800'
                }`}>
                    {feedback}
                </div>
            )}

            {previewUrl && (
                <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
                    <div className="bg-white rounded-lg w-full max-w-3xl max-h-[90vh] overflow-auto p-4">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-lg font-semibold">{previewName}</h3>
                            <button className="btn btn-secondary" onClick={() => setPreviewUrl(null)}>Cerrar</button>
                        </div>
                        <img src={previewUrl} alt={previewName} className="w-full h-auto rounded border border-gray-200" />
                    </div>
                </div>
            )}

            <div className="rounded-xl border border-slate-200 bg-gradient-to-r from-slate-50 via-white to-blue-50 px-5 py-4">
                <h1 className="text-3xl font-bold text-slate-900">Hallazgos</h1>
                <p className="text-slate-600 mt-1">Workflow de atencion y remediacion</p>
            </div>

            <div className="card border-slate-200 shadow-sm">
                <div className="card-body">
                    <label className="block text-sm font-medium mb-2 text-slate-700">Filtrar por auditoria</label>
                    <select className="input max-w-md" value={selectedAudit} onChange={(e) => setSelectedAudit(e.target.value)}>
                        <option value="">Todas</option>
                        {audits.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                </div>
            </div>

            <div className="card border-slate-200 shadow-sm">
                <div className="card-header bg-slate-50/80"><h3 className="text-lg font-semibold text-slate-800">Listado de Hallazgos</h3></div>
                <div className="card-body p-0 overflow-x-auto">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Título</th>
                                <th>Estado</th>
                                <th>Auditoría</th>
                                <th>Actualizado</th>
                            </tr>
                        </thead>
                        <tbody>
                            {findings.map((f) => (
                                <tr
                                    key={f.id}
                                    onClick={() => setSelectedFindingId(f.id)}
                                    className={selectedFindingId === f.id ? 'bg-blue-50 cursor-pointer' : 'cursor-pointer'}
                                >
                                    <td>{f.title}</td>
                                    <td>
                                        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusBadgeClass(f.status)}`}>
                                            {statusLabels[f.status]}
                                        </span>
                                    </td>
                                    <td>{audits.find((a) => a.id === f.audit_id)?.name || f.audit_id.slice(0, 8)}</td>
                                    <td>{new Date(f.updated_at).toLocaleString()}</td>
                                </tr>
                            ))}
                            {findings.length === 0 && (
                                <tr><td colSpan={4} className="text-center text-gray-500 py-8">No hay hallazgos.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {selectedFinding && (
                <div className="card border-slate-200 shadow-sm">
                    <div className="card-header bg-slate-50/80"><h3 className="text-lg font-semibold text-slate-800">Detalle del Hallazgo</h3></div>
                    <div className="card-body space-y-3">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <h3 className="text-lg font-semibold">{selectedFinding.title}</h3>
                                <p className="text-sm text-gray-600">{selectedFinding.description || 'Sin descripcion'}</p>
                            </div>
                            <select
                                className="input w-52"
                                value={selectedFinding.status}
                                onChange={(e) => updateMutation.mutate({ id: selectedFinding.id, status: e.target.value })}
                            >
                                {statuses.map((s) => <option key={s} value={s}>{statusLabels[s]}</option>)}
                            </select>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="flex gap-2">
                                <input
                                    className="input"
                                    placeholder="Agregar comentario"
                                    value={commentText}
                                    onChange={(e) => setCommentText(e.target.value)}
                                />
                                <button
                                    className="btn btn-secondary"
                                    onClick={() => commentMutation.mutate({ id: selectedFinding.id, text: commentText })}
                                    disabled={!commentText.trim()}
                                >
                                    Comentar
                                </button>
                            </div>
                            <div>
                                <input
                                    type="file"
                                    className="input"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) evidenceMutation.mutate({ id: selectedFinding.id, file });
                                    }}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <p className="text-xs font-semibold text-gray-700 mb-1">Comentarios</p>
                                <div className="max-h-48 overflow-y-auto rounded border border-gray-200 p-2 text-sm text-gray-700 space-y-1">
                                    {comments.length === 0 && <p className="text-gray-500 text-xs">Sin comentarios.</p>}
                                    {comments.map((c) => (
                                        <p key={c.id}>
                                            <span className="font-semibold">{c.user_name || 'Usuario'}:</span> {c.comment_text}
                                        </p>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-gray-700 mb-1">Evidencias</p>
                                <div className="max-h-48 overflow-y-auto rounded border border-gray-200 p-2 text-sm text-gray-700 space-y-1">
                                    {evidence.length === 0 && <p className="text-gray-500 text-xs">Sin evidencias.</p>}
                                    {evidence.map((e) => (
                                        <div key={e.id} className="flex items-center justify-between gap-2 border-b border-gray-100 py-1">
                                            <span className="truncate">{e.file_name} ({Math.round(e.file_size / 1024)} KB)</span>
                                            {isImageFile(e) && (
                                                <button
                                                    className="btn btn-secondary"
                                                    onClick={() => previewMutation.mutate({ findingId: selectedFinding.id, evidenceId: e.id })}
                                                    title="Ver imagen"
                                                >
                                                    <Eye size={16} />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {narrative && (
                            <div className="rounded-lg border border-slate-200 bg-white p-4">
                                <h4 className="text-sm font-semibold text-slate-900">Redacción automática (basada en este hallazgo)</h4>
                                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-slate-700">
                                    <div className="rounded-md border border-slate-200 p-3">
                                        <p className="font-semibold text-slate-900">Qué es</p>
                                        <p className="mt-1">{narrative.whatIs}</p>
                                    </div>
                                    <div className="rounded-md border border-slate-200 p-3">
                                        <p className="font-semibold text-slate-900">Criterio</p>
                                        <p className="mt-1">{narrative.criteria}</p>
                                    </div>
                                    <div className="rounded-md border border-slate-200 p-3">
                                        <p className="font-semibold text-slate-900">Efecto</p>
                                        <p className="mt-1">{narrative.effect}</p>
                                    </div>
                                    <div className="rounded-md border border-slate-200 p-3">
                                        <p className="font-semibold text-slate-900">Causa</p>
                                        <p className="mt-1">{narrative.cause}</p>
                                    </div>
                                    <div className="rounded-md border border-slate-200 p-3 md:col-span-2">
                                        <p className="font-semibold text-slate-900">Recomendación</p>
                                        <p className="mt-1">{narrative.recommendation}</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
