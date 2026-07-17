# pyrefly: ignore [missing-import]
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from uuid import UUID
from pydantic import BaseModel
from typing import Any, Literal, Optional
import json
import re

from app.core.database import get_db
from app.core.config import settings
from app.models.sod import Conflict, SoDRule
from app.models.audit import Audit
from app.models.sap import SAPUser
from app.models.finding import Finding
from app.models.user import AppUser
from app.api.deps import get_current_user
from sqlalchemy import func

from google import genai

router = APIRouter(prefix="/ai", tags=["AI"])

class AIResponse(BaseModel):
    content: str


class GomezitoContext(BaseModel):
    pathname: str
    page_help: str
    pending_action: Optional[str] = None
    known_audit_id: Optional[str] = None


class GomezitoRequest(BaseModel):
    message: str
    context: GomezitoContext
    recent_messages: list[dict[str, str]] = []


class GomezitoAction(BaseModel):
    type: Literal[
        "none",
        "navigate",
        "create_audit",
        "download_report",
        "list_audits",
        "explain_current_page",
        "detect_conflicts",
        "create_findings_from_conflicts",
        "summarize_current_audit",
    ] = "none"
    target: Optional[str] = None
    data: dict[str, Any] = {}


class GomezitoResponse(BaseModel):
    reply: str
    action: GomezitoAction = GomezitoAction()

def get_genai_client():
    if not settings.GEMINI_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Gemini API Key no está configurada."
        )
    return genai.Client(api_key=settings.GEMINI_API_KEY)


def _extract_json_object(text: str) -> dict[str, Any]:
    cleaned = text.strip()
    cleaned = re.sub(r"^```(?:json)?", "", cleaned).strip()
    cleaned = re.sub(r"```$", "", cleaned).strip()
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", cleaned, flags=re.DOTALL)
        if not match:
            raise
        return json.loads(match.group(0))


@router.post("/gomezito", response_model=GomezitoResponse)
def gomezito_agent(
    payload: GomezitoRequest,
    db: Session = Depends(get_db),
    current_user: AppUser = Depends(get_current_user),
):
    """Conversational brain for Gomezito. It suggests safe frontend actions."""
    client = get_genai_client()

    audits_count = db.query(Audit).count()
    current_audit = None
    audit_metrics = "sin auditoria actual"
    if payload.context.known_audit_id:
        try:
            current_audit = db.query(Audit).filter(Audit.id == UUID(payload.context.known_audit_id)).first()
        except ValueError:
            current_audit = None

    if current_audit:
        total_users = db.query(func.count(SAPUser.id)).filter(SAPUser.audit_id == current_audit.id).scalar() or 0
        total_conflicts = db.query(func.count(Conflict.id)).filter(Conflict.audit_id == current_audit.id).scalar() or 0
        total_findings = db.query(func.count(Finding.id)).filter(Finding.audit_id == current_audit.id).scalar() or 0
        high_conflicts = db.query(func.count(Conflict.id)).join(
            SoDRule, Conflict.rule_id == SoDRule.id
        ).filter(
            Conflict.audit_id == current_audit.id,
            SoDRule.severity == "HIGH",
        ).scalar() or 0
        top_rule_row = db.query(
            SoDRule.name,
            func.count(Conflict.id).label("qty"),
        ).join(
            Conflict, Conflict.rule_id == SoDRule.id
        ).filter(
            Conflict.audit_id == current_audit.id
        ).group_by(
            SoDRule.name
        ).order_by(
            func.count(Conflict.id).desc()
        ).first()
        top_rule = f"{top_rule_row[0]} ({top_rule_row[1]} conflictos)" if top_rule_row else "ninguna"
        audit_metrics = (
            f"usuarios SAP: {total_users}; conflictos: {total_conflicts}; "
            f"conflictos altos: {high_conflicts}; hallazgos: {total_findings}; "
            f"regla mas vulnerada: {top_rule}"
        )

    recent = "\n".join(
        f"{msg.get('sender', 'unknown')}: {msg.get('text', '')}"
        for msg in payload.recent_messages[-8:]
    )

    prompt = f"""
Eres Gomezito, un agente operativo dentro de un sistema web de auditoria SAP SoD.
Hablas en espanol claro, profesional y breve. Puedes explicar pantallas, guiar al usuario y sugerir acciones.

Usuario actual:
- username: {current_user.username}
- rol: {current_user.role}

Contexto de la pagina:
- ruta: {payload.context.pathname}
- ayuda de pantalla: {payload.context.page_help}
- accion pendiente: {payload.context.pending_action or "ninguna"}
- auditoria actual: {current_audit.name if current_audit else "ninguna"}
- metricas de auditoria actual: {audit_metrics}
- auditorias registradas: {audits_count}

Acciones permitidas:
- none: solo responder.
- navigate: target debe ser uno de "/", "/audits", "/audits/create", "/sod-rules", "/findings", "/reports".
- create_audit: data puede contener name, company_name, period_start, period_end. Usa fechas YYYY-MM-DD si el usuario las da.
- download_report: target debe ser "pdf", "excel" o "both".
- list_audits: listar auditorias.
- explain_current_page: explicar la pantalla actual.
- detect_conflicts: ejecutar deteccion SoD en la auditoria actual.
- create_findings_from_conflicts: crear hallazgos desde conflictos sin hallazgo.
- summarize_current_audit: resumir la auditoria actual usando las metricas disponibles.

Reglas:
- No inventes datos. Si faltan datos para crear auditoria, pide solo lo faltante.
- Si el usuario pide descargar/generar reportes, usa download_report.
- Si pide crear auditoria con datos completos, usa create_audit.
- Si pide navegar, usa navigate.
- Si pide detectar o recalcular conflictos, usa detect_conflicts.
- Si pide crear hallazgos desde conflictos, usa create_findings_from_conflicts.
- Si pide analizar/resumir la auditoria actual, usa summarize_current_audit o responde con las metricas.
- Devuelve SOLO JSON valido. Sin markdown. Sin texto extra.

Formato exacto:
{{
  "reply": "respuesta para el usuario",
  "action": {{
    "type": "none",
    "target": null,
    "data": {{}}
  }}
}}

Conversacion reciente:
{recent}

Mensaje del usuario:
{payload.message}
"""

    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
        )
        parsed = _extract_json_object(response.text or "")
        return GomezitoResponse(**parsed)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error comunicando con Gomezito IA: {str(e)}")


@router.post("/mitigation/{conflict_id}", response_model=AIResponse)
def suggest_mitigation(
    conflict_id: UUID,
    db: Session = Depends(get_db)
):
    """Generate AI mitigation plan for a specific conflict"""
    conflict = db.query(Conflict).filter(Conflict.id == conflict_id).first()
    if not conflict:
        raise HTTPException(status_code=404, detail="Conflict not found")
        
    rule = conflict.rule
    user = conflict.sap_user
    
    prompt = f"""
    Eres un auditor senior experto en SAP Seguridad y Segregación de Funciones (SoD).
    Se ha detectado el siguiente conflicto SoD:
    - Regla Violada: {rule.name}
    - Nivel de Severidad: {rule.severity}
    - Score de Riesgo: {conflict.risk_score}/100
    - Usuario SAP: {user.user_id} ({user.full_name})
    - Transacciones que tiene del Set A (Causa 1): {conflict.tcodes_set_a}
    - Transacciones que tiene del Set B (Causa 2): {conflict.tcodes_set_b}

    Tu tarea es proponer un Plan de Mitigación o Controles Compensatorios para este caso específico.
    El tono debe ser profesional, directo y estructurado en Markdown.
    Incluye:
    1. Análisis breve del riesgo (por qué estas transacciones juntas son peligrosas).
    2. Recomendación de remediación técnica (ej. qué roles o tcodes quitar).
    3. Controles compensatorios propuestos (si el negocio exige que el usuario mantenga el acceso).
    Sea conciso.
    """
    
    try:
        client = get_genai_client()
        response = client.models.generate_content(
            model="gemini-2.5-flash", 
            contents=prompt
        )
        return {"content": response.text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error comunicando con Gemini: {str(e)}")


@router.post("/summary/{audit_id}", response_model=AIResponse)
def generate_audit_summary(
    audit_id: UUID,
    db: Session = Depends(get_db)
):
    """Generate AI executive summary for an entire audit"""
    audit = db.query(Audit).filter(Audit.id == audit_id).first()
    if not audit:
        raise HTTPException(status_code=404, detail="Audit not found")
        
    conflicts = db.query(Conflict).filter(Conflict.audit_id == audit_id).all()
    
    total_conflicts = len(conflicts)
    if total_conflicts == 0:
        return {"content": "La auditoría no tiene conflictos detectados. Excelente nivel de seguridad."}
        
    high_risk = len([c for c in conflicts if getattr(c.rule, 'severity', '') == 'HIGH' or c.risk_score >= 80])
    affected_users = len(set([c.sap_user_id for c in conflicts]))
    
    # Get top rules
    rule_counts = {}
    for c in conflicts:
        rname = c.rule.name if c.rule else "Desconocida"
        rule_counts[rname] = rule_counts.get(rname, 0) + 1
        
    top_rules = sorted(rule_counts.items(), key=lambda x: x[1], reverse=True)[:5]
    top_rules_text = "\n".join([f"- {r[0]}: {r[1]} conflictos" for r in top_rules])
    
    prompt = f"""
    Eres un Director de Auditoría TI (CISA) experto en SAP.
    Redacta un Resumen Ejecutivo para la gerencia basado en los siguientes resultados de una evaluación de Segregación de Funciones (SoD):
    
    - Empresa Auditada: {audit.company_name}
    - Total de Conflictos Detectados: {total_conflicts}
    - Conflictos de Alto Riesgo: {high_risk}
    - Usuarios SAP Afectados: {affected_users}
    
    Top Reglas SoD Violadas:
    {top_rules_text}
    
    Tu tarea es redactar un resumen ejecutivo profesional y estructurado en Markdown.
    Incluye:
    1. Conclusión General sobre el estado de la seguridad de accesos.
    2. Riesgos Clave identificados (basado en el Top de Reglas violadas).
    3. Siguientes Pasos Recomendados para la Gerencia.
    El lenguaje debe ser claro para nivel gerencial (sin demasiados tecnicismos de SAP TCodes).
    Sea directo y persuasivo.
    
    IMPORTANTE: NO incluyas un encabezado formal como "Para:", "De:", "Fecha:", "Asunto:". Tampoco incluyas una despedida como "Atentamente," ni tu nombre o firma al final. Inicia directamente con el contenido del resumen y finaliza con el último párrafo de los siguientes pasos.
    """
    
    try:
        client = get_genai_client()
        response = client.models.generate_content(
            model="gemini-2.5-flash", 
            contents=prompt
        )
        return {"content": response.text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error comunicando con Gemini: {str(e)}")
