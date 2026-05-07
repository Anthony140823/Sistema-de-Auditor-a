import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { auditsApi } from '@/api/audits';
import { sodApi } from '@/api/sod';
import { findingsApi } from '@/api/findings';
import { reportsApi } from '@/api/reports';
import type { ConflictDetectionResponse, ConflictDetectionProgress, ImportValidationResult } from '@/types';
import {
    Bar,
    BarChart,
    Cell,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';

type StepState = 'pending' | 'ready' | 'done' | 'error';

export default function AuditDetail() {
    const { id = '' } = useParams();
    const queryClient = useQueryClient();
    const [usersFile, setUsersFile] = useState<File | null>(null);
    const [rolesFile, setRolesFile] = useState<File | null>(null);
    const [tcodesFile, setTcodesFile] = useState<File | null>(null);
    const [severity, setSeverity] = useState('');
    const [userFilter, setUserFilter] = useState('');
    const [ruleFilter, setRuleFilter] = useState('');
    const [minRiskScore, setMinRiskScore] = useState<number | ''>('');
    const [usersImport, setUsersImport] = useState<ImportValidationResult | null>(null);
    const [rolesImport, setRolesImport] = useState<ImportValidationResult | null>(null);
    const [tcodesImport, setTcodesImport] = useState<ImportValidationResult | null>(null);
    const [detectResult, setDetectResult] = useState<ConflictDetectionResponse | null>(null);
    const [findingFeedback, setFindingFeedback] = useState<string>('');
    const [findingFeedbackType, setFindingFeedbackType] = useState<'success' | 'error'>('success');

    const { data: audit } = useQuery({
        queryKey: ['audit', id],
        queryFn: () => auditsApi.get(id),
        enabled: !!id,
    });

    const { data: importStatus } = useQuery({
        queryKey: ['import-status', id],
        queryFn: () => auditsApi.getImportStatus(id),
        enabled: !!id,
    });

    const { data: conflicts = [] } = useQuery({
        queryKey: ['conflicts', id, severity, userFilter, ruleFilter, minRiskScore],
        queryFn: () => sodApi.listConflicts(id, {
            severity: severity || undefined,
            user_id: userFilter || undefined,
            rule_id: ruleFilter || undefined,
            min_risk_score: minRiskScore === '' ? undefined : Number(minRiskScore),
        }),
        enabled: !!id,
    });

    const { data: findingsForAudit = [] } = useQuery({
        queryKey: ['findings-by-audit', id],
        queryFn: () => findingsApi.list(id),
        enabled: !!id,
    });

    const detectMutation = useMutation({
        mutationFn: () => auditsApi.detectConflicts(id),
        onMutate: () => {
            setDetectResult(null);
        },
        onSuccess: (result) => {
            setDetectResult(result);
            queryClient.invalidateQueries({ queryKey: ['conflicts', id] });
        },
    });

    const { data: detectProgress } = useQuery<ConflictDetectionProgress>({
        queryKey: ['detect-progress', id],
        queryFn: () => auditsApi.getDetectProgress(id),
        enabled: !!id && detectMutation.isPending,
        refetchInterval: 700,
        refetchIntervalInBackground: true,
    });

    const uploadUsers = useMutation({
        mutationFn: () => {
            if (!usersFile) {
                throw new Error('Selecciona un archivo de usuarios.');
            }
            return auditsApi.importUsers(id, usersFile);
        },
        onSuccess: (result) => {
            setUsersImport(result);
            queryClient.invalidateQueries({ queryKey: ['import-status', id] });
        },
    });
    const uploadRoles = useMutation({
        mutationFn: () => {
            if (!rolesFile) {
                throw new Error('Selecciona un archivo de usuario-roles.');
            }
            return auditsApi.importUserRoles(id, rolesFile);
        },
        onSuccess: (result) => {
            setRolesImport(result);
            queryClient.invalidateQueries({ queryKey: ['import-status', id] });
        },
    });
    const uploadTcodes = useMutation({
        mutationFn: () => {
            if (!tcodesFile) {
                throw new Error('Selecciona un archivo de rol-tcodes.');
            }
            return auditsApi.importRoleTCodes(id, tcodesFile);
        },
        onSuccess: (result) => {
            setTcodesImport(result);
            queryClient.invalidateQueries({ queryKey: ['import-status', id] });
        },
    });

    const bulkCreateFindings = useMutation({
        mutationFn: async () => {
            const missing = conflicts.filter((c) => !existingFindingConflictIds.has(c.id));
            if (missing.length === 0) return { created: 0 };
            await Promise.all(
                missing.map((conflict) => {
                    const userLabel = conflict.user_name || conflict.user_id || conflict.sap_user_id;
                    const ruleLabel = conflict.rule_name || conflict.rule_id;
                    return findingsApi.create({
                        audit_id: id,
                        conflict_id: conflict.id,
                        title: `Conflicto SoD: ${userLabel} | ${ruleLabel}`,
                        description: `Hallazgo generado desde conflicto SoD. Risk Score: ${conflict.risk_score}`,
                    });
                })
            );
            return { created: missing.length };
        },
        onSuccess: (result) => {
            setFindingFeedbackType('success');
            setFindingFeedback(result.created > 0 ? `Hallazgos creados: ${result.created}` : 'No hay hallazgos pendientes por crear.');
            queryClient.invalidateQueries({ queryKey: ['findings'] });
            queryClient.invalidateQueries({ queryKey: ['findings-by-audit', id] });
            setTimeout(() => setFindingFeedback(''), 3000);
        },
        onError: () => {
            setFindingFeedbackType('error');
            setFindingFeedback('No se pudieron crear los hallazgos.');
            setTimeout(() => setFindingFeedback(''), 3000);
        },
    });

    const highRisk = useMemo(() => conflicts.filter(c => c.risk_score >= 80).length, [conflicts]);
    const avgRiskScore = useMemo(() => {
        if (conflicts.length === 0) return 0;
        const sum = conflicts.reduce((acc, c) => acc + (Number(c.risk_score) || 0), 0);
        return Math.round((sum / conflicts.length) * 10) / 10;
    }, [conflicts]);
    const affectedUsersCount = useMemo(
        () => new Set(conflicts.map((c) => c.user_id || c.sap_user_id)).size,
        [conflicts]
    );
    const severitySummary = useMemo(() => {
        const counts: Record<string, number> = { HIGH: 0, MEDIUM: 0, LOW: 0 };
        for (const c of conflicts) {
            const sev = String(c.rule_severity || '').toUpperCase();
            if (sev in counts) counts[sev] += 1;
        }
        const total = conflicts.length || 1;
        const toPct = (n: number) => Math.round((n / total) * 100);
        return {
            counts,
            pieData: [
                { name: 'Alto', key: 'HIGH', value: counts.HIGH, pct: toPct(counts.HIGH) },
                { name: 'Medio', key: 'MEDIUM', value: counts.MEDIUM, pct: toPct(counts.MEDIUM) },
                { name: 'Bajo', key: 'LOW', value: counts.LOW, pct: toPct(counts.LOW) },
            ],
        };
    }, [conflicts]);
    const topRulesData = useMemo(() => {
        const map = new Map<string, { name: string; total: number; high: number }>();
        for (const c of conflicts) {
            const id = String(c.rule_id || '');
            const name = String(c.rule_name || c.rule_id || 'Regla');
            const sev = String(c.rule_severity || '').toUpperCase();
            const prev = map.get(id) || { name, total: 0, high: 0 };
            prev.total += 1;
            if (sev === 'HIGH') prev.high += 1;
            map.set(id, prev);
        }
        return Array.from(map.values())
            .sort((a, b) => b.total - a.total)
            .slice(0, 6)
            .map((r) => ({
                name: r.name.length > 24 ? `${r.name.slice(0, 24)}…` : r.name,
                total: r.total,
                high: r.high,
            }));
    }, [conflicts]);
    const uniqueUsers = useMemo(
        () => Array.from(new Map(conflicts.map((c) => [c.user_id || c.sap_user_id, c.user_name || c.user_id || c.sap_user_id])).entries()),
        [conflicts]
    );
    const uniqueRules = useMemo(
        () => Array.from(new Map(conflicts.map((c) => [c.rule_id, c.rule_name || c.rule_id])).entries()),
        [conflicts]
    );
    const existingFindingConflictIds = useMemo(
        () => new Set(findingsForAudit.filter((f) => f.conflict_id).map((f) => f.conflict_id as string)),
        [findingsForAudit]
    );
    const pendingFindingsCount = useMemo(
        () => conflicts.filter((c) => !existingFindingConflictIds.has(c.id)).length,
        [conflicts, existingFindingConflictIds]
    );
    const hasUsersLoaded = (usersImport?.valid_rows || 0) > 0 || (importStatus?.users_count || 0) > 0;
    const hasUserRolesLoaded = (rolesImport?.valid_rows || 0) > 0 || (importStatus?.user_roles_count || 0) > 0;
    const hasRoleTcodesLoaded = (tcodesImport?.valid_rows || 0) > 0 || (importStatus?.role_tcodes_count || 0) > 0;
    const importsReady = hasUsersLoaded && hasUserRolesLoaded && hasRoleTcodesLoaded;
    const canDetect = importsReady && !uploadUsers.isPending && !uploadRoles.isPending && !uploadTcodes.isPending && !detectMutation.isPending;
    const affectedRules = useMemo(
        () => new Set(conflicts.map((c) => c.rule_id)).size,
        [conflicts]
    );

    const getImportState = (
        result: ImportValidationResult | null,
        isPending: boolean,
        isError: boolean,
        hasSelectedFile: boolean
    ): { state: StepState; label: string } => {
        if (isPending) return { state: 'ready', label: 'Subiendo...' };
        if (isError) return { state: 'error', label: 'Error' };
        if (result) {
            if (result.success && result.valid_rows > 0) return { state: 'done', label: 'Cargado' };
            return { state: 'error', label: 'Con errores' };
        }
        if (hasSelectedFile) return { state: 'ready', label: 'Listo para subir' };
        return { state: 'pending', label: 'Pendiente' };
    };

    const usersState = getImportState(usersImport, uploadUsers.isPending, uploadUsers.isError, Boolean(usersFile));
    const rolesState = getImportState(rolesImport, uploadRoles.isPending, uploadRoles.isError, Boolean(rolesFile));
    const tcodesState = getImportState(tcodesImport, uploadTcodes.isPending, uploadTcodes.isError, Boolean(tcodesFile));
    const usersDuplicateOnly = Boolean(
        usersImport &&
        usersImport.valid_rows === 0 &&
        usersImport.errors.length > 0 &&
        usersImport.errors.every((e) => String(e.error || '').toLowerCase().includes('already exists'))
    );
    const rolesDuplicateOnly = Boolean(
        rolesImport &&
        rolesImport.valid_rows === 0 &&
        rolesImport.errors.length > 0 &&
        rolesImport.errors.every((e) => String(e.error || '').toLowerCase().includes('already exists'))
    );
    const tcodesDuplicateOnly = Boolean(
        tcodesImport &&
        tcodesImport.valid_rows === 0 &&
        tcodesImport.errors.length > 0 &&
        tcodesImport.errors.every((e) => String(e.error || '').toLowerCase().includes('already exists'))
    );

    const usersStateFinal = hasUsersLoaded && usersState.state !== 'ready'
        ? { state: 'done' as StepState, label: `Ya cargado (${importStatus?.users_count || usersImport?.valid_rows || 0})` }
        : usersState;
    const rolesStateFinal = hasUserRolesLoaded && rolesState.state !== 'ready'
        ? { state: 'done' as StepState, label: `Ya cargado (${importStatus?.user_roles_count || rolesImport?.valid_rows || 0})` }
        : rolesState;
    const tcodesStateFinal = hasRoleTcodesLoaded && tcodesState.state !== 'ready'
        ? { state: 'done' as StepState, label: `Ya cargado (${importStatus?.role_tcodes_count || tcodesImport?.valid_rows || 0})` }
        : tcodesState;

    const stepClass = (state: StepState) => {
        if (state === 'done') return 'bg-green-50 text-green-700 border-green-200';
        if (state === 'ready') return 'bg-amber-50 text-amber-700 border-amber-200';
        if (state === 'error') return 'bg-red-50 text-red-700 border-red-200';
        return 'bg-gray-50 text-gray-600 border-gray-200';
    };

    return (
        <div className="space-y-6">
            {findingFeedback && (
                <div className={`fixed top-4 right-4 z-50 rounded-md border px-4 py-3 text-sm shadow-lg ${
                    findingFeedbackType === 'success'
                        ? 'border-green-200 bg-green-50 text-green-800'
                        : 'border-red-200 bg-red-50 text-red-800'
                }`}>
                    {findingFeedback}
                </div>
            )}

            <div className="flex items-start justify-between gap-3">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">{audit?.name || 'Auditoría'}</h1>
                    <p className="text-gray-600 mt-1">{audit?.company_name}</p>
                </div>
                <div className="flex gap-2">
                    <button className="btn btn-secondary" onClick={() => reportsApi.exportConflictsExcel(id)}>Excel Conflictos</button>
                    <button className="btn btn-secondary" onClick={() => reportsApi.exportExecutivePdf(id)}>Reporte PDF</button>
                    <button className="btn btn-primary" onClick={() => detectMutation.mutate()} disabled={!canDetect}>
                        {detectMutation.isPending ? 'Analizando...' : 'Detectar Conflictos'}
                    </button>
                </div>
            </div>

            <div className="card">
                <div className="card-body space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                        <div className={`rounded-md border px-3 py-2 text-sm ${stepClass(usersStateFinal.state)}`}>
                            1. Usuarios SAP: <strong>{usersStateFinal.label}</strong>
                        </div>
                        <div className={`rounded-md border px-3 py-2 text-sm ${stepClass(rolesStateFinal.state)}`}>
                            2. Usuario-Roles: <strong>{rolesStateFinal.label}</strong>
                        </div>
                        <div className={`rounded-md border px-3 py-2 text-sm ${stepClass(tcodesStateFinal.state)}`}>
                            3. Rol-TCodes: <strong>{tcodesStateFinal.label}</strong>
                        </div>
                        <div className={`rounded-md border px-3 py-2 text-sm ${importsReady ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                            4. Detectar Conflictos: <strong>{importsReady ? 'Habilitado' : 'Bloqueado'}</strong>
                        </div>
                    </div>

                    {detectMutation.isPending && (
                        <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2">
                            <p className="text-sm text-blue-800">
                                Analizando conflictos... {detectProgress?.progress_percent ?? 0}%
                            </p>
                            <div className="mt-2 h-2 w-full rounded bg-blue-100 overflow-hidden">
                                <div
                                    className="h-2 rounded bg-blue-500 transition-all"
                                    style={{ width: `${detectProgress?.progress_percent ?? 0}%` }}
                                />
                            </div>
                            {(detectProgress?.current_rule || detectProgress?.current_user) && (
                                <p className="text-xs text-blue-700 mt-2">
                                    {detectProgress?.current_rule ? `Regla: ${detectProgress.current_rule}` : ''}
                                    {detectProgress?.current_rule && detectProgress?.current_user ? ' | ' : ''}
                                    {detectProgress?.current_user ? `Usuario: ${detectProgress.current_user}` : ''}
                                </p>
                            )}
                        </div>
                    )}

                    {detectResult && (
                        <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
                            Detección completada: <strong>{detectResult.total_conflicts}</strong> conflictos en <strong>{detectResult.execution_time_seconds}s</strong>.
                        </div>
                    )}

                    {detectMutation.isError && (
                        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                            Error en detección: {(detectMutation.error as Error)?.message || 'no se pudo completar.'}
                        </div>
                    )}

                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="card"><div className="card-body"><p className="text-sm text-gray-600">Total conflictos</p><p className="text-2xl font-bold">{conflicts.length}</p></div></div>
                <div className="card"><div className="card-body"><p className="text-sm text-gray-600">Riesgo alto (&gt;=80)</p><p className="text-2xl font-bold text-danger-600">{highRisk}</p></div></div>
                <div className="card"><div className="card-body"><p className="text-sm text-gray-600">Reglas afectadas</p><p className="text-2xl font-bold">{affectedRules}</p></div></div>
            </div>

            <div className="card">
                <div className="card-header"><h3 className="text-lg font-semibold">Importación SAP</h3></div>
                <div className="card-body grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium">Usuarios SAP</p>
                            <span className={`text-xs px-2 py-1 rounded border ${stepClass(usersStateFinal.state)}`}>{usersStateFinal.label}</span>
                        </div>
                        <input type="file" className="input" accept=".csv,.xlsx,.xls" onChange={(e) => setUsersFile(e.target.files?.[0] || null)} />
                        <button className="btn btn-primary w-full" onClick={() => uploadUsers.mutate()} disabled={!usersFile || uploadUsers.isPending}>
                            {uploadUsers.isPending ? 'Subiendo...' : 'Subir'}
                        </button>
                        {usersImport && (usersImport.success || !usersDuplicateOnly) && (
                            <p className={`text-xs rounded-md border px-2 py-1 ${usersImport.success ? 'text-green-700 bg-green-50 border-green-200' : 'text-red-700 bg-red-50 border-red-200'}`}>
                                {usersImport.success ? `OK: ${usersImport.valid_rows}/${usersImport.total_rows} filas válidas.` : 'Error al importar.'}
                                {usersImport.errors.length > 0 ? ` Errores: ${usersImport.errors.length}.` : ''}
                            </p>
                        )}
                        {usersImport && !usersImport.success && usersDuplicateOnly && (
                            <p className="text-xs rounded-md border px-2 py-1 text-amber-700 bg-amber-50 border-amber-200">
                                Ya estaba cargado previamente en esta auditoría.
                            </p>
                        )}
                        {uploadUsers.isError && <p className="text-xs text-red-700">Error al subir usuarios.</p>}
                    </div>
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium">Usuario-Roles</p>
                            <span className={`text-xs px-2 py-1 rounded border ${stepClass(rolesStateFinal.state)}`}>{rolesStateFinal.label}</span>
                        </div>
                        <input type="file" className="input" accept=".csv,.xlsx,.xls" onChange={(e) => setRolesFile(e.target.files?.[0] || null)} />
                        <button className="btn btn-primary w-full" onClick={() => uploadRoles.mutate()} disabled={!rolesFile || uploadRoles.isPending}>
                            {uploadRoles.isPending ? 'Subiendo...' : 'Subir'}
                        </button>
                        {rolesImport && (rolesImport.success || !rolesDuplicateOnly) && (
                            <p className={`text-xs rounded-md border px-2 py-1 ${rolesImport.success ? 'text-green-700 bg-green-50 border-green-200' : 'text-red-700 bg-red-50 border-red-200'}`}>
                                {rolesImport.success ? `OK: ${rolesImport.valid_rows}/${rolesImport.total_rows} filas válidas.` : 'Error al importar.'}
                                {rolesImport.errors.length > 0 ? ` Errores: ${rolesImport.errors.length}.` : ''}
                            </p>
                        )}
                        {rolesImport && !rolesImport.success && rolesDuplicateOnly && (
                            <p className="text-xs rounded-md border px-2 py-1 text-amber-700 bg-amber-50 border-amber-200">
                                Ya estaba cargado previamente en esta auditoría.
                            </p>
                        )}
                        {uploadRoles.isError && <p className="text-xs text-red-700">Error al subir usuario-roles.</p>}
                    </div>
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium">Rol-TCodes</p>
                            <span className={`text-xs px-2 py-1 rounded border ${stepClass(tcodesStateFinal.state)}`}>{tcodesStateFinal.label}</span>
                        </div>
                        <input type="file" className="input" accept=".csv,.xlsx,.xls" onChange={(e) => setTcodesFile(e.target.files?.[0] || null)} />
                        <button className="btn btn-primary w-full" onClick={() => uploadTcodes.mutate()} disabled={!tcodesFile || uploadTcodes.isPending}>
                            {uploadTcodes.isPending ? 'Subiendo...' : 'Subir'}
                        </button>
                        {tcodesImport && (tcodesImport.success || !tcodesDuplicateOnly) && (
                            <p className={`text-xs rounded-md border px-2 py-1 ${tcodesImport.success ? 'text-green-700 bg-green-50 border-green-200' : 'text-red-700 bg-red-50 border-red-200'}`}>
                                {tcodesImport.success ? `OK: ${tcodesImport.valid_rows}/${tcodesImport.total_rows} filas válidas.` : 'Error al importar.'}
                                {tcodesImport.errors.length > 0 ? ` Errores: ${tcodesImport.errors.length}.` : ''}
                            </p>
                        )}
                        {tcodesImport && !tcodesImport.success && tcodesDuplicateOnly && (
                            <p className="text-xs rounded-md border px-2 py-1 text-amber-700 bg-amber-50 border-amber-200">
                                Ya estaba cargado previamente en esta auditoría.
                            </p>
                        )}
                        {uploadTcodes.isError && <p className="text-xs text-red-700">Error al subir rol-tcodes.</p>}
                    </div>
                </div>
            </div>

            <div className="card">
                <div className="card-header flex items-center justify-between gap-3">
                    <h3 className="text-lg font-semibold">Conflictos Detectados</h3>
                    <button
                        className="btn btn-secondary"
                        onClick={() => bulkCreateFindings.mutate()}
                        disabled={bulkCreateFindings.isPending || pendingFindingsCount === 0 || conflicts.length === 0}
                        title={pendingFindingsCount === 0 ? 'Ya están creados.' : 'Crea un hallazgo por cada conflicto listado.'}
                    >
                        {bulkCreateFindings.isPending ? 'Creando...' : `Crear hallazgos (${pendingFindingsCount})`}
                    </button>
                </div>
                <div className="card-body border-b border-gray-200 grid grid-cols-1 md:grid-cols-4 gap-3">
                    <select className="input" value={severity} onChange={(e) => setSeverity(e.target.value)}>
                        <option value="">Todas severidades</option>
                        <option value="HIGH">HIGH</option>
                        <option value="MEDIUM">MEDIUM</option>
                        <option value="LOW">LOW</option>
                    </select>
                    <select className="input" value={userFilter} onChange={(e) => setUserFilter(e.target.value)}>
                        <option value="">Todos usuarios</option>
                        {uniqueUsers.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                    <select className="input" value={ruleFilter} onChange={(e) => setRuleFilter(e.target.value)}>
                        <option value="">Todas reglas</option>
                        {uniqueRules.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                    <input
                        className="input"
                        type="number"
                        min={0}
                        max={100}
                        placeholder="Risk mínimo"
                        value={minRiskScore}
                        onChange={(e) => setMinRiskScore(e.target.value === '' ? '' : Number(e.target.value))}
                    />
                </div>
                <div className="card-body border-b border-gray-200">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        <div className="lg:col-span-1 grid grid-cols-2 gap-3">
                            <div className="rounded-lg border bg-white p-3">
                                <p className="text-xs text-gray-500">Conflictos (filtrados)</p>
                                <p className="text-2xl font-semibold">{conflicts.length}</p>
                                <p className="text-xs text-gray-500 mt-1">Son accesos incompatibles detectados.</p>
                            </div>
                            <div className="rounded-lg border bg-white p-3">
                                <p className="text-xs text-gray-500">Usuarios afectados</p>
                                <p className="text-2xl font-semibold">{affectedUsersCount}</p>
                                <p className="text-xs text-gray-500 mt-1">Personas con al menos 1 conflicto.</p>
                            </div>
                            <div className="rounded-lg border bg-white p-3">
                                <p className="text-xs text-gray-500">Alto riesgo</p>
                                <p className="text-2xl font-semibold">{severitySummary.counts.HIGH}</p>
                                <p className="text-xs text-gray-500 mt-1">Requiere atención prioritaria.</p>
                            </div>
                            <div className="rounded-lg border bg-white p-3">
                                <p className="text-xs text-gray-500">Risk Score promedio</p>
                                <p className="text-2xl font-semibold">{avgRiskScore}</p>
                                <p className="text-xs text-gray-500 mt-1">De 0 a 100 (más alto = más crítico).</p>
                            </div>
                        </div>

                        <div className="lg:col-span-1 rounded-lg border bg-white p-3">
                            <div className="flex items-center justify-between">
                                <p className="text-sm font-medium">Distribución por severidad</p>
                                <p className="text-xs text-gray-500">{conflicts.length ? 'Qué tan graves son' : ''}</p>
                            </div>
                            <div className="h-[180px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={severitySummary.pieData}
                                            dataKey="value"
                                            nameKey="name"
                                            innerRadius="55%"
                                            outerRadius="80%"
                                            paddingAngle={2}
                                        >
                                            {severitySummary.pieData.map((entry) => (
                                                <Cell
                                                    key={entry.key}
                                                    fill={entry.key === 'HIGH' ? '#E53935' : entry.key === 'MEDIUM' ? '#FB8C00' : '#43A047'}
                                                />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            formatter={(value: unknown, _name: unknown, props: any) => {
                                                const v = Number(value) || 0;
                                                const pct = props?.payload?.pct ?? 0;
                                                return [`${v} (${pct}%)`, 'Conflictos'];
                                            }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                                {severitySummary.pieData.map((s) => (
                                    <div key={s.key} className="rounded border px-2 py-1 text-center">
                                        <p className="font-medium">{s.name}</p>
                                        <p className="text-gray-600">{s.value} ({s.pct}%)</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="lg:col-span-1 rounded-lg border bg-white p-3">
                            <div className="flex items-center justify-between">
                                <p className="text-sm font-medium">Reglas más frecuentes</p>
                                <p className="text-xs text-gray-500">Top 6</p>
                            </div>
                            <div className="h-[180px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={topRulesData} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                                        <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} />
                                        <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                                        <Tooltip />
                                        <Bar dataKey="total" fill="#1E88E5" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                            <p className="text-xs text-gray-500 mt-2">
                                Una “regla” representa una combinación de permisos que no deberían estar juntos.
                            </p>
                        </div>
                    </div>
                </div>
                <div className="card-body p-0 overflow-x-auto">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Usuario</th>
                                <th>Regla</th>
                                <th>Severidad</th>
                                <th>Risk Score</th>
                                <th>Acción</th>
                            </tr>
                        </thead>
                        <tbody>
                            {conflicts.map((c) => (
                                <tr key={c.id}>
                                    <td>{c.user_name || c.sap_user_id}</td>
                                    <td>{c.rule_name || c.rule_id}</td>
                                    <td>{c.rule_severity}</td>
                                    <td className="font-semibold">{c.risk_score}</td>
                                    <td>
                                        {existingFindingConflictIds.has(c.id) ? (
                                            <span className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium border-emerald-200 bg-emerald-50 text-emerald-700">
                                                Hallazgo creado
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium border-amber-200 bg-amber-50 text-amber-800">
                                                Pendiente
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {conflicts.length === 0 && (
                                <tr><td colSpan={5} className="text-center text-gray-500 py-8">No hay conflictos aún.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
