# pyrefly: ignore [missing-import]
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from uuid import UUID
from pydantic import BaseModel
from typing import Dict, Any

from app.core.database import get_db
from app.core.config import settings
from app.models.sod import Conflict, SoDRule
from app.models.audit import Audit
from app.models.sap import SAPUser

from google import genai

router = APIRouter(prefix="/ai", tags=["AI"])

class AIResponse(BaseModel):
    content: str

def get_genai_client():
    if not settings.GEMINI_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Gemini API Key no está configurada."
        )
    return genai.Client(api_key=settings.GEMINI_API_KEY)


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
