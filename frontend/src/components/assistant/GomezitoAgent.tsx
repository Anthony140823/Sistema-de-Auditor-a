import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
    ChevronDown,
    Download,
    HelpCircle,
    Map,
    Mic,
    MicOff,
    Navigation,
    Send,
    Sparkles,
    Volume2,
    VolumeX,
    X,
} from 'lucide-react';
import { auditsApi } from '@/api/audits';
import { reportsApi } from '@/api/reports';
import { aiApi, type GomezitoAgentResponse } from '@/api/ai';
import { sodApi } from '@/api/sod';
import { findingsApi } from '@/api/findings';
import { dashboardApi } from '@/api/dashboard';
import type { Audit, Conflict } from '@/types';

type GomezitoMessage = {
    id: number;
    sender: 'gomezito' | 'user';
    text: string;
};

type PendingAction =
    | {
        type: 'create_audit';
        data: Partial<Pick<Audit, 'name' | 'company_name' | 'period_start' | 'period_end'>>;
    }
    | {
        type: 'confirm';
        label: string;
        action: 'detect_conflicts' | 'create_findings_from_conflicts';
    }
    | null;

type SpeechRecognitionInstance = {
    lang: string;
    continuous: boolean;
    interimResults: boolean;
    start: () => void;
    stop: () => void;
    onresult: ((event: SpeechRecognitionEventLike) => void) | null;
    onend: (() => void) | null;
    onerror: (() => void) | null;
};

type SpeechRecognitionEventLike = {
    results: ArrayLike<ArrayLike<{ transcript: string }>>;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

declare global {
    interface Window {
        SpeechRecognition?: SpeechRecognitionConstructor;
        webkitSpeechRecognition?: SpeechRecognitionConstructor;
    }
}

const initialMessages: GomezitoMessage[] = [
    {
        id: 1,
        sender: 'gomezito',
        text: 'Hola, soy Gomezito. Puedo guiarte por el sistema, explicar cada módulo y llevarte a cualquier sección. Escríbeme o usa el micrófono.',
    },
];

const routeHelp: Record<string, string> = {
    '/': 'Estás en el Dashboard Ejecutivo. Aquí ves usuarios SAP, conflictos SoD, hallazgos abiertos, severidad de riesgos y reglas más vulneradas. Usa el selector superior para cambiar de auditoría.',
    '/audits': 'Estás en Auditorías. Desde aquí puedes revisar proyectos existentes, abrir una auditoría o crear una nueva evaluación de accesos SAP.',
    '/audits/create': 'Estás creando una auditoría. Completa nombre, empresa y periodo. Al guardar, pasarás al detalle para importar datos SAP.',
    '/sod-rules': 'Estás en Reglas SoD. Aquí se definen combinaciones incompatibles de transacciones SAP. Cada regla tiene Set A, Set B, severidad y riesgo base.',
    '/findings': 'Estás en Hallazgos. Aquí se gestionan observaciones formales: estados, comentarios, evidencias y seguimiento de remediación.',
    '/reports': 'Estás en Reportes. Puedes descargar el PDF ejecutivo y el Excel de conflictos de la auditoría seleccionada.',
};

const quickActions = [
    { label: 'Explicar', command: 'explica esta pantalla', icon: HelpCircle },
    { label: 'Resumen', command: 'resumen de la auditoría actual', icon: Map },
    { label: 'Detectar', command: 'detectar conflictos', icon: Navigation },
    { label: 'PDF', command: 'descargar pdf ejecutivo', icon: Download },
];

function GomezitoRobot({ active = false }: { active?: boolean }) {
    return (
        <div className="relative h-24 w-20">
            <div className={`absolute left-1/2 top-0 h-3 w-3 -translate-x-1/2 rounded-full ${active ? 'bg-success-400' : 'bg-primary-300'} shadow-[0_0_18px_rgba(56,189,248,0.9)]`} />
            <div className="absolute left-1/2 top-3 h-5 w-0.5 -translate-x-1/2 bg-slate-500" />
            <div className="absolute left-1/2 top-7 h-9 w-14 -translate-x-1/2 rounded-[18px] border border-cyan-200/70 bg-gradient-to-b from-slate-100 to-slate-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_12px_24px_rgba(15,23,42,0.25)]">
                <div className="absolute left-2 top-3 h-2.5 w-2.5 rounded-full bg-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.95)]" />
                <div className="absolute right-2 top-3 h-2.5 w-2.5 rounded-full bg-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.95)]" />
                <div className="absolute bottom-2 left-1/2 h-1 w-6 -translate-x-1/2 rounded-full bg-slate-500" />
            </div>
            <div className="absolute left-1/2 top-[62px] h-11 w-16 -translate-x-1/2 rounded-xl border border-cyan-200/70 bg-gradient-to-br from-slate-800 via-slate-700 to-slate-950 shadow-[0_16px_28px_rgba(15,23,42,0.32)]">
                <div className="absolute left-1/2 top-2 h-5 w-9 -translate-x-1/2 rounded-md border border-cyan-300/60 bg-cyan-400/15">
                    <div className="mx-auto mt-1 h-1.5 w-5 rounded-full bg-cyan-300 shadow-[0_0_10px_rgba(103,232,249,0.95)]" />
                </div>
                <div className="absolute -left-3 top-2 h-8 w-3 rounded-l-full bg-slate-700 shadow-inner" />
                <div className="absolute -right-3 top-2 h-8 w-3 rounded-r-full bg-slate-700 shadow-inner" />
                <div className="absolute bottom-1.5 left-3 h-1 w-2 rounded bg-primary-300" />
                <div className="absolute bottom-1.5 right-3 h-1 w-2 rounded bg-success-300" />
            </div>
            {active && (
                <>
                    <div className="absolute left-0 top-9 h-16 w-16 rounded-full border border-cyan-300/30 animate-ping" />
                    <div className="absolute right-1 top-2 h-2 w-2 rounded-full bg-success-300 shadow-[0_0_12px_rgba(74,222,128,0.9)]" />
                </>
            )}
        </div>
    );
}

function normalize(text: string) {
    return text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();
}

function getContextualHelp(pathname: string) {
    if (pathname.startsWith('/audits/') && pathname !== '/audits/create') {
        return 'Estás en el detalle de una auditoría. El flujo recomendado es: importar usuarios SAP, importar usuario-roles, importar rol-TCodes, ejecutar detección de conflictos, revisar riesgos, crear hallazgos y exportar reportes.';
    }
    return routeHelp[pathname] || 'Puedo ayudarte a navegar y entender esta pantalla. Prueba con: “ir a reportes”, “qué son conflictos SoD” o “guíame por el flujo completo”.';
}

function extractDate(text: string, label: 'inicio' | 'fin') {
    const normalized = normalize(text);
    const labelPattern = label === 'inicio'
        ? '(inicio|desde|periodo inicio|fecha inicio)'
        : '(fin|hasta|periodo fin|fecha fin)';
    const labeledMatch = normalized.match(new RegExp(`${labelPattern}\\s*[:=]?\\s*(\\d{4}-\\d{2}-\\d{2})`));
    if (labeledMatch?.[2]) return labeledMatch[2];

    const allDates = normalized.match(/\d{4}-\d{2}-\d{2}/g) || [];
    if (label === 'inicio') return allDates[0];
    return allDates[1];
}

function extractNamedValue(text: string, keys: string[]) {
    const pattern = new RegExp(`(?:${keys.join('|')})\\s*[:=]\\s*([^,;\\n]+)`, 'i');
    const match = text.match(pattern);
    return match?.[1]?.trim();
}

function parseAuditData(text: string) {
    const nameFromLabel = extractNamedValue(text, ['nombre', 'auditoria', 'auditoría']);
    const companyFromLabel = extractNamedValue(text, ['empresa', 'compania', 'compañia', 'compañía']);
    const periodStart = extractDate(text, 'inicio');
    const periodEnd = extractDate(text, 'fin');

    return {
        name: nameFromLabel,
        company_name: companyFromLabel,
        period_start: periodStart,
        period_end: periodEnd,
    };
}

type CreateAuditPendingAction = Extract<PendingAction, { type: 'create_audit' }>;

function missingAuditFields(data: CreateAuditPendingAction) {
    const missing: string[] = [];
    if (!data.data.name) missing.push('nombre');
    if (!data.data.company_name) missing.push('empresa');
    if (!data.data.period_start) missing.push('fecha de inicio');
    if (!data.data.period_end) missing.push('fecha de fin');
    return missing;
}

function getAuditIdFromPath(pathname: string) {
    const match = pathname.match(/^\/audits\/([^/]+)$/);
    return match?.[1];
}

function isDirectDeterministicCommand(command: string) {
    return (
        command.includes('cancelar') ||
        command.includes('salir') ||
        command.includes('olvida') ||
        command.includes('descargar') ||
        command.includes('generar') ||
        command.includes('detectar') ||
        command.includes('recalcular') ||
        command.includes('convertir') ||
        command.includes('dashboard') ||
        command.includes('inicio') ||
        command.includes('auditoria') ||
        command.includes('auditorias') ||
        command.includes('regla') ||
        command.includes('hallazgo') ||
        command.includes('hallazgos') ||
        command.includes('reporte') ||
        command.includes('pdf') ||
        command.includes('excel')
    );
}

function isCreateAuditDataCommand(command: string) {
    return (
        command.includes('nombre') ||
        command.includes('empresa') ||
        command.includes('inicio') ||
        command.includes('fin') ||
        /\d{4}-\d{2}-\d{2}/.test(command)
    );
}

export default function GomezitoAgent() {
    const navigate = useNavigate();
    const location = useLocation();
    const [open, setOpen] = useState(false);
    const [minimized, setMinimized] = useState(false);
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState<GomezitoMessage[]>(initialMessages);
    const [voiceEnabled, setVoiceEnabled] = useState(true);
    const [listening, setListening] = useState(false);
    const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
    const [selectedVoiceURI, setSelectedVoiceURI] = useState('');
    const [busy, setBusy] = useState(false);
    const [pendingAction, setPendingAction] = useState<PendingAction>(null);
    const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
    const messagesEndRef = useRef<HTMLDivElement | null>(null);

    const selectedVoice = useMemo(() => {
        return voices.find((voice) => voice.voiceURI === selectedVoiceURI) || voices[0];
    }, [selectedVoiceURI, voices]);

    const supportsSpeech = typeof window !== 'undefined' && 'speechSynthesis' in window;
    const Recognition = typeof window !== 'undefined'
        ? window.SpeechRecognition || window.webkitSpeechRecognition
        : undefined;
    const supportsRecognition = Boolean(Recognition);

    useEffect(() => {
        if (!supportsSpeech) return;

        const loadVoices = () => {
            const availableVoices = window.speechSynthesis.getVoices();
            const spanishVoices = availableVoices.filter((voice) => voice.lang.toLowerCase().startsWith('es'));
            const preferred = spanishVoices.length > 0 ? spanishVoices : availableVoices;
            setVoices(preferred);
            setSelectedVoiceURI((current) => current || preferred[0]?.voiceURI || '');
        };

        loadVoices();
        window.speechSynthesis.onvoiceschanged = loadVoices;

        return () => {
            window.speechSynthesis.cancel();
            window.speechSynthesis.onvoiceschanged = null;
        };
    }, [supportsSpeech]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, open, minimized]);

    const speak = (text: string) => {
        if (!voiceEnabled || !supportsSpeech) return;
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = selectedVoice?.lang || 'es-ES';
        utterance.rate = 0.95;
        utterance.pitch = 0.85;
        if (selectedVoice) utterance.voice = selectedVoice;
        window.speechSynthesis.speak(utterance);
    };

    const addMessage = (sender: GomezitoMessage['sender'], text: string) => {
        setMessages((current) => [...current, { id: Date.now() + Math.random(), sender, text }]);
    };

    const respond = (text: string) => {
        addMessage('gomezito', text);
        speak(text);
    };

    const getTargetAudit = async () => {
        const routeAuditId = getAuditIdFromPath(location.pathname);
        if (routeAuditId) {
            return auditsApi.get(routeAuditId);
        }

        const audits = await auditsApi.list();
        if (audits.length === 0) return null;
        return [...audits].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))[0];
    };

    const createAuditFromPending = async (action: CreateAuditPendingAction) => {
        const missing = missingAuditFields(action);
        if (missing.length > 0) {
            respond(`Para crearla necesito: ${missing.join(', ')}. Puedes escribir algo como: nombre: Auditoría SAP 2026, empresa: Besalco, inicio: 2026-01-01, fin: 2026-12-31.`);
            return;
        }

        setBusy(true);
        try {
            const audit = await auditsApi.create(action.data);
            setPendingAction(null);
            navigate(`/audits/${audit.id}`);
            respond(`Auditoría creada: ${audit.name}. Te llevé al detalle para importar datos SAP y ejecutar la detección SoD.`);
        } catch (error) {
            respond('No pude crear la auditoría. Revisa que las fechas tengan formato AAAA-MM-DD y que tu usuario tenga permisos de auditor o administrador.');
        } finally {
            setBusy(false);
        }
    };

    const downloadReport = async (kind: 'pdf' | 'excel' | 'both') => {
        setBusy(true);
        try {
            const audit = await getTargetAudit();
            if (!audit) {
                respond('No encontré auditorías disponibles. Primero crea una auditoría y luego podré descargar reportes.');
                return;
            }

            if (kind === 'pdf' || kind === 'both') {
                await reportsApi.exportExecutivePdf(audit.id);
            }
            if (kind === 'excel' || kind === 'both') {
                await reportsApi.exportConflictsExcel(audit.id);
            }

            const label = kind === 'both' ? 'PDF ejecutivo y Excel de conflictos' : kind === 'pdf' ? 'PDF ejecutivo' : 'Excel de conflictos';
            respond(`Listo. Descargué el ${label} para la auditoría "${audit.name}".`);
        } catch (error) {
            respond('No pude descargar el reporte. Verifica que el backend esté activo, que exista la auditoría y que tengas permisos.');
        } finally {
            setBusy(false);
        }
    };

    const listAudits = async () => {
        setBusy(true);
        try {
            const audits = await auditsApi.list();
            if (audits.length === 0) {
                respond('No hay auditorías registradas todavía. Puedo crear una si me das nombre, empresa, inicio y fin.');
                return;
            }
            const summary = audits
                .slice(0, 5)
                .map((audit, index) => `${index + 1}. ${audit.name} (${audit.status})`)
                .join(' ');
            respond(`Estas son las auditorías más recientes que encontré: ${summary}`);
        } catch (error) {
            respond('No pude consultar auditorías. Verifica la conexión con el backend.');
        } finally {
            setBusy(false);
        }
    };

    const getRequiredAudit = async () => {
        const audit = await getTargetAudit();
        if (!audit) {
            respond('No encontré una auditoría disponible. Crea o abre una auditoría primero.');
            return null;
        }
        return audit;
    };

    const summarizeCurrentAudit = async () => {
        setBusy(true);
        try {
            const audit = await getRequiredAudit();
            if (!audit) return;
            const stats = await dashboardApi.summary(audit.id);
            const high = stats.conflicts_by_severity.HIGH || 0;
            const medium = stats.conflicts_by_severity.MEDIUM || 0;
            const low = stats.conflicts_by_severity.LOW || 0;
            const openFindings = (stats.findings_by_status.OPEN || 0) + (stats.findings_by_status.IN_REVIEW || 0);
            const topRule = stats.top_violated_rules[0]?.rule_name || 'sin regla dominante';
            respond(`Resumen de "${audit.name}": ${stats.total_users} usuarios SAP, ${stats.total_conflicts} conflictos SoD (${high} altos, ${medium} medios, ${low} bajos), ${openFindings} hallazgos abiertos o en revisión. La regla más vulnerada es: ${topRule}.`);
        } catch (error) {
            respond('No pude generar el resumen de la auditoría. Verifica la conexión y que la auditoría tenga datos cargados.');
        } finally {
            setBusy(false);
        }
    };

    const detectConflictsForCurrentAudit = async () => {
        setBusy(true);
        try {
            const audit = await getRequiredAudit();
            if (!audit) return;
            const result = await auditsApi.detectConflicts(audit.id);
            respond(`Detección terminada para "${audit.name}": encontré ${result.total_conflicts} conflictos. Altos: ${result.conflicts_by_severity.HIGH}, medios: ${result.conflicts_by_severity.MEDIUM}, bajos: ${result.conflicts_by_severity.LOW}.`);
        } catch (error) {
            respond('No pude ejecutar la detección. Revisa que existan usuarios, roles, TCodes importados y que tu rol tenga permisos.');
        } finally {
            setBusy(false);
        }
    };

    const createFindingsFromConflicts = async () => {
        setBusy(true);
        try {
            const audit = await getRequiredAudit();
            if (!audit) return;
            const [conflicts, findings] = await Promise.all([
                sodApi.listConflicts(audit.id),
                findingsApi.list(audit.id),
            ]);
            const existingConflictIds = new Set(findings.map((finding) => finding.conflict_id).filter(Boolean));
            const missing = conflicts.filter((conflict: Conflict) => !existingConflictIds.has(conflict.id));

            if (missing.length === 0) {
                respond(`No hay conflictos pendientes de convertir en hallazgos para "${audit.name}".`);
                return;
            }

            await Promise.all(
                missing.map((conflict) => {
                    const userLabel = conflict.user_name || conflict.user_id || conflict.sap_user_id;
                    const ruleLabel = conflict.rule_name || conflict.rule_id;
                    return findingsApi.create({
                        audit_id: audit.id,
                        conflict_id: conflict.id,
                        title: `Conflicto SoD: ${userLabel} | ${ruleLabel}`,
                        description: `Hallazgo generado por Gomezito desde conflicto SoD. Riesgo: ${conflict.risk_score}. TCodes Set A: ${conflict.tcodes_set_a.join(', ')}. TCodes Set B: ${conflict.tcodes_set_b.join(', ')}.`,
                    });
                })
            );

            respond(`Listo. Creé ${missing.length} hallazgos desde conflictos para "${audit.name}".`);
        } catch (error) {
            respond('No pude crear los hallazgos. Verifica permisos y que la auditoría tenga conflictos detectados.');
        } finally {
            setBusy(false);
        }
    };

    const askConfirmation = (label: string, action: 'detect_conflicts' | 'create_findings_from_conflicts') => {
        setPendingAction({ type: 'confirm', label, action });
        respond(`${label}. Esta acción modificará datos de la auditoría. Escribe "confirmar" para continuar o "cancelar" para detenerla.`);
    };

    const executeAgentAction = async (agentResponse: GomezitoAgentResponse) => {
        const action = agentResponse.action;
        if (!action || action.type === 'none') return;

        if (action.type === 'navigate') {
            const allowedTargets = ['/', '/audits', '/audits/create', '/sod-rules', '/findings', '/reports'];
            const target = action.target || '/';
            if (allowedTargets.includes(target)) {
                navigate(target);
            }
            return;
        }

        if (action.type === 'list_audits') {
            await listAudits();
            return;
        }

        if (action.type === 'explain_current_page') {
            respond(getContextualHelp(location.pathname));
            return;
        }

        if (action.type === 'download_report') {
            const target = action.target === 'excel' || action.target === 'both' ? action.target : 'pdf';
            await downloadReport(target);
            return;
        }

        if (action.type === 'create_audit') {
            const data = action.data || {};
            const auditAction = {
                type: 'create_audit' as const,
                data: {
                    name: typeof data.name === 'string' ? data.name : undefined,
                    company_name: typeof data.company_name === 'string' ? data.company_name : 'Consorcio Besalco Stracon',
                    period_start: typeof data.period_start === 'string' ? data.period_start : undefined,
                    period_end: typeof data.period_end === 'string' ? data.period_end : undefined,
                },
            };
            setPendingAction(auditAction);
            navigate('/audits/create');
            await createAuditFromPending(auditAction);
            return;
        }

        if (action.type === 'detect_conflicts') {
            askConfirmation('Voy a ejecutar la detección SoD en la auditoría actual', 'detect_conflicts');
            return;
        }

        if (action.type === 'create_findings_from_conflicts') {
            askConfirmation('Voy a crear hallazgos desde los conflictos que aún no tienen hallazgo', 'create_findings_from_conflicts');
            return;
        }

        if (action.type === 'summarize_current_audit') {
            await summarizeCurrentAudit();
        }
    };

    const askAIGomezito = async (rawCommand: string, command: string) => {
        if (isDirectDeterministicCommand(command) || pendingAction) return false;

        setBusy(true);
        try {
            const response = await aiApi.askGomezito({
                message: rawCommand,
                context: {
                    pathname: location.pathname,
                    page_help: getContextualHelp(location.pathname),
                    pending_action: null,
                    known_audit_id: getAuditIdFromPath(location.pathname) || null,
                },
                recent_messages: messages.slice(-8).map((message) => ({
                    sender: message.sender,
                    text: message.text,
                })),
            });

            respond(response.reply);
            await executeAgentAction(response);
            return true;
        } catch (error) {
            return false;
        } finally {
            setBusy(false);
        }
    };

    const handleCommand = async (rawCommand: string) => {
        const command = normalize(rawCommand);

        if (!command) return;
        addMessage('user', rawCommand);

        const handledByAI = await askAIGomezito(rawCommand, command);
        if (handledByAI) return;

        if (command.includes('cancelar') || command.includes('salir') || command.includes('olvida')) {
            setPendingAction(null);
            respond('Listo, cancelé la acción pendiente. Puedes pedirme otra cosa cuando quieras.');
            return;
        }

        if (pendingAction?.type === 'confirm') {
            if (command.includes('confirmar') || command.includes('si') || command.includes('sí') || command.includes('adelante')) {
                const action = pendingAction.action;
                setPendingAction(null);
                if (action === 'detect_conflicts') {
                    await detectConflictsForCurrentAudit();
                } else {
                    await createFindingsFromConflicts();
                }
                return;
            }
            respond(`Tengo pendiente: ${pendingAction.label}. Escribe "confirmar" para ejecutarlo o "cancelar" para detenerlo.`);
            return;
        }

        if (pendingAction?.type === 'create_audit' && isCreateAuditDataCommand(command)) {
            const parsed = parseAuditData(rawCommand);
            const nextAction = {
                type: 'create_audit' as const,
                data: {
                    ...pendingAction.data,
                    ...Object.fromEntries(Object.entries(parsed).filter(([, value]) => Boolean(value))),
                },
            };
            setPendingAction(nextAction);
            await createAuditFromPending(nextAction);
            return;
        }

        if (command.includes('dashboard') || command.includes('inicio') || command.includes('principal')) {
            navigate('/');
            respond('Listo. Te llevé al Dashboard Ejecutivo. Aquí puedes ver el estado general de riesgos y hallazgos.');
            return;
        }

        if (command.includes('auditoria') || command.includes('auditorias')) {
            if (command.includes('crear') || command.includes('nueva')) {
                const parsed = parseAuditData(rawCommand);
                const action = {
                    type: 'create_audit' as const,
                    data: {
                        company_name: 'Consorcio Besalco Stracon',
                        ...Object.fromEntries(Object.entries(parsed).filter(([, value]) => Boolean(value))),
                    },
                };
                setPendingAction(action);
                navigate('/audits/create');
                await createAuditFromPending(action);
            } else {
                navigate('/audits');
                if (command.includes('listar') || command.includes('muestra') || command.includes('ver')) {
                    await listAudits();
                } else {
                    respond('Te llevé a Auditorías. Desde aquí puedes abrir auditorías existentes o crear una nueva.');
                }
            }
            return;
        }

        if (command.includes('regla') || command.includes('sod')) {
            navigate('/sod-rules');
            respond('Te llevé a Reglas SoD. Aquí se configuran combinaciones incompatibles de transacciones SAP.');
            return;
        }

        if (command.includes('hallazgo') || command.includes('observacion') || command.includes('remediacion')) {
            if (command.includes('crear') || command.includes('convertir') || command.includes('generar')) {
                askConfirmation('Voy a crear hallazgos desde los conflictos que aún no tienen hallazgo', 'create_findings_from_conflicts');
                return;
            }
            navigate('/findings');
            respond('Te llevé a Hallazgos. Aquí puedes revisar estados, comentarios, responsables y evidencias.');
            return;
        }

        if (command.includes('detectar') || command.includes('recalcular')) {
            askConfirmation('Voy a ejecutar la detección SoD en la auditoría actual', 'detect_conflicts');
            return;
        }

        if (command.includes('descargar') && (command.includes('pdf') || command.includes('excel') || command.includes('reporte'))) {
            if (command.includes('pdf') && command.includes('excel')) {
                await downloadReport('both');
            } else if (command.includes('excel')) {
                await downloadReport('excel');
            } else {
                await downloadReport('pdf');
            }
            return;
        }

        if (command.includes('generar') && (command.includes('reporte') || command.includes('pdf') || command.includes('excel'))) {
            if (command.includes('excel')) {
                await downloadReport('excel');
            } else if (command.includes('pdf')) {
                await downloadReport('pdf');
            } else {
                await downloadReport('both');
            }
            return;
        }

        if (command.includes('reporte') || command.includes('pdf') || command.includes('excel')) {
            navigate('/reports');
            respond('Te llevé a Reportes. También puedo descargar por ti si dices “descargar PDF”, “descargar Excel” o “descargar PDF y Excel”.');
            return;
        }

        if (command.includes('explica') || command.includes('ayuda') || command.includes('pantalla') || command.includes('donde estoy')) {
            respond(getContextualHelp(location.pathname));
            return;
        }

        if (command.includes('resumen') || command.includes('analiza') || command.includes('estado actual')) {
            await summarizeCurrentAudit();
            return;
        }

        if (command.includes('flujo') || command.includes('guiame') || command.includes('guia') || command.includes('pasos')) {
            respond('El flujo completo es: 1. crear o abrir una auditoría; 2. importar usuarios SAP; 3. importar usuario-roles; 4. importar rol-TCodes; 5. ejecutar detección de conflictos SoD; 6. convertir conflictos relevantes en hallazgos; 7. asignar responsables y evidencias; 8. generar reportes PDF o Excel.');
            return;
        }

        if (command.includes('conflicto')) {
            respond('Un conflicto SoD ocurre cuando un usuario SAP tiene permisos de dos grupos incompatibles. Por ejemplo, crear proveedor y pagar proveedor. El sistema cruza roles, TCodes y reglas para calcular el riesgo.');
            return;
        }

        if (command.includes('riesgo') || command.includes('risk')) {
            respond('El riesgo combina severidad de la regla, usuario activo, login reciente, usuario crítico y cantidad de TCodes en conflicto. Un puntaje alto debe priorizarse para remediación.');
            return;
        }

        if (command.includes('importar') || command.includes('archivo') || command.includes('excel') || command.includes('csv')) {
            respond('Para importar datos abre una auditoría. Sube tres archivos: usuarios SAP, asignaciones usuario-rol y asignaciones rol-TCode. Luego ejecuta la detección de conflictos.');
            return;
        }

            respond('Puedo ayudarte con navegación, explicación y acciones. Prueba: “crear auditoría”, “listar auditorías”, “descargar PDF”, “descargar Excel”, “explica esta pantalla” o “guíame por el flujo completo”.');
    };

    const handleSubmit = (event: FormEvent) => {
        event.preventDefault();
        const value = input.trim();
        if (!value) return;
        setInput('');
        void handleCommand(value);
    };

    const toggleListening = () => {
        if (!Recognition) {
            respond('Tu navegador no permite reconocimiento de voz aquí. Puedes escribirme y seguiré guiándote.');
            return;
        }

        if (listening) {
            recognitionRef.current?.stop();
            setListening(false);
            return;
        }

        const recognition = new Recognition();
        recognition.lang = 'es-ES';
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.onresult = (event) => {
            const transcript = event.results[0]?.[0]?.transcript || '';
            setListening(false);
            if (transcript) {
                void handleCommand(transcript);
            }
        };
        recognition.onerror = () => {
            setListening(false);
            respond('No pude escuchar bien. Inténtalo otra vez o escríbeme el comando.');
        };
        recognition.onend = () => setListening(false);
        recognitionRef.current = recognition;
        setListening(true);
        recognition.start();
    };

    const openAgent = () => {
        setOpen(true);
        setMinimized(false);
    };

    if (!open) {
        return (
            <button
                type="button"
                onClick={openAgent}
                className="group fixed bottom-5 right-5 z-50 flex h-28 w-24 items-center justify-center rounded-2xl border border-cyan-200/60 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-950 text-white shadow-[0_22px_44px_rgba(15,23,42,0.35)] ring-4 ring-cyan-100/80 transition hover:-translate-y-1 hover:shadow-[0_26px_60px_rgba(2,132,199,0.35)]"
                title="Abrir Gomezito"
            >
                <div className="absolute inset-0 rounded-2xl bg-[radial-gradient(circle_at_50%_0%,rgba(34,211,238,0.28),transparent_58%)]" />
                <GomezitoRobot active={listening || busy} />
                <span className="absolute -left-3 top-4 rounded-full border border-cyan-200 bg-white px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-800 shadow-lg">
                    Gomezito
                </span>
                <span className="absolute -right-1 -top-1 h-5 w-5 rounded-full bg-success-500 ring-2 ring-white" />
            </button>
        );
    }

    return (
        <div className="fixed bottom-6 right-6 z-50 w-[min(460px,calc(100vw-2rem))]">
            <div className="overflow-hidden rounded-2xl border border-cyan-200/70 bg-white shadow-[0_28px_70px_rgba(15,23,42,0.35)]">
                <div className="relative overflow-hidden bg-slate-950 px-4 py-4 text-white">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_10%,rgba(14,165,233,0.34),transparent_28%),radial-gradient(circle_at_86%_20%,rgba(34,197,94,0.18),transparent_26%)]" />
                    <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-cyan-300 to-transparent" />
                    <div className="relative flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-cyan-300/40 bg-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]">
                            <GomezitoRobot active={listening || busy} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <p className="text-lg font-bold tracking-wide">Gomezito</p>
                                <span className="rounded-full border border-cyan-300/50 bg-cyan-300/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-cyan-100">
                                    online
                                </span>
                            </div>
                            <p className="text-xs text-slate-300">Agente operativo de auditoría SoD</p>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                                <span className="rounded-full bg-white/10 px-2 py-1 text-[10px] text-cyan-100">voz</span>
                                <span className="rounded-full bg-white/10 px-2 py-1 text-[10px] text-cyan-100">navegación</span>
                                <span className="rounded-full bg-white/10 px-2 py-1 text-[10px] text-cyan-100">reportes</span>
                                <span className="rounded-full bg-white/10 px-2 py-1 text-[10px] text-cyan-100">auditorías</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                        <button
                            type="button"
                            className="rounded-md p-2 text-slate-200 hover:bg-white/10"
                            onClick={() => setVoiceEnabled((enabled) => !enabled)}
                            title={voiceEnabled ? 'Desactivar voz' : 'Activar voz'}
                        >
                            {voiceEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
                        </button>
                        <button
                            type="button"
                            className="rounded-md p-2 text-slate-200 hover:bg-white/10"
                            onClick={() => setMinimized((value) => !value)}
                            title="Minimizar"
                        >
                            <ChevronDown size={18} />
                        </button>
                        <button
                            type="button"
                            className="rounded-md p-2 text-slate-200 hover:bg-white/10"
                            onClick={() => setOpen(false)}
                            title="Cerrar"
                        >
                            <X size={18} />
                        </button>
                    </div>
                    </div>
                </div>

                {!minimized && (
                    <>
                        <div className="border-b border-cyan-100 bg-gradient-to-r from-slate-50 via-cyan-50 to-slate-50 px-4 py-3">
                            <div className="flex items-center gap-2 text-xs text-slate-600">
                                <Sparkles size={14} className="text-primary-600" />
                                <span>{getContextualHelp(location.pathname)}</span>
                            </div>
                            <div className="mt-3 grid grid-cols-3 gap-2">
                                <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                                    <p className="text-[10px] uppercase text-slate-500">Estado</p>
                                    <p className="text-xs font-semibold text-slate-900">{busy ? 'Ejecutando' : listening ? 'Escuchando' : 'Disponible'}</p>
                                </div>
                                <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                                    <p className="text-[10px] uppercase text-slate-500">Canal</p>
                                    <p className="text-xs font-semibold text-slate-900">{voiceEnabled ? 'Voz + texto' : 'Texto'}</p>
                                </div>
                                <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                                    <p className="text-[10px] uppercase text-slate-500">Acceso</p>
                                    <p className="text-xs font-semibold text-slate-900">Operativo</p>
                                </div>
                            </div>
                            {voices.length > 0 && (
                                <select
                                    className="mt-3 w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    value={selectedVoiceURI}
                                    onChange={(event) => setSelectedVoiceURI(event.target.value)}
                                    title="Voz de Gomezito"
                                >
                                    {voices.map((voice) => (
                                        <option key={voice.voiceURI} value={voice.voiceURI}>
                                            {voice.name} ({voice.lang})
                                        </option>
                                    ))}
                                </select>
                            )}
                        </div>

                        <div className="max-h-80 space-y-3 overflow-y-auto bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] px-4 py-4">
                            {messages.map((message) => (
                                <div
                                    key={message.id}
                                    className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div
                                        className={`max-w-[85%] rounded-lg px-3 py-2 text-sm leading-relaxed ${
                                            message.sender === 'user'
                                                ? 'bg-primary-600 text-white'
                                                : 'border border-cyan-100 bg-white text-slate-800 shadow-sm'
                                        }`}
                                    >
                                        {message.text}
                                    </div>
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>

                        <div className="grid grid-cols-2 gap-2 border-t border-slate-200 bg-slate-50 px-4 py-3 sm:grid-cols-4">
                                    {quickActions.map((action) => {
                                const Icon = action.icon;
                                return (
                                    <button
                                        key={action.command}
                                        type="button"
                                        onClick={() => void handleCommand(action.command)}
                                        className="flex items-center justify-center gap-1 rounded-lg border border-cyan-100 bg-white px-2 py-2 text-xs font-medium text-slate-700 shadow-sm hover:border-cyan-300 hover:bg-cyan-50"
                                    >
                                        <Icon size={14} />
                                        {action.label}
                                    </button>
                                );
                            })}
                        </div>

                        <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t border-slate-200 bg-white p-3">
                            <button
                                type="button"
                                onClick={toggleListening}
                                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                                    listening
                                        ? 'bg-danger-600 text-white'
                                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                }`}
                                title={supportsRecognition ? 'Hablar con Gomezito' : 'Reconocimiento de voz no disponible'}
                            >
                                {listening ? <MicOff size={18} /> : <Mic size={18} />}
                            </button>
                            <input
                                value={input}
                                onChange={(event) => setInput(event.target.value)}
                                disabled={busy}
                                className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                                placeholder={busy ? 'Gomezito está trabajando...' : 'Escribe: crear auditoría, descargar PDF...'}
                            />
                            <button
                                type="submit"
                                disabled={busy}
                                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-600 text-white hover:bg-primary-700"
                                title="Enviar"
                            >
                                <Send size={18} />
                            </button>
                        </form>
                    </>
                )}
            </div>
        </div>
    );
}
