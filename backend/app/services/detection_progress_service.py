"""
In-memory progress tracking for SoD conflict detection jobs.
"""
from datetime import datetime
from threading import Lock
from typing import Dict, Optional
from uuid import UUID


_PROGRESS: Dict[str, dict] = {}
_LOCK = Lock()


def start_detection(audit_id: UUID, total_steps: int) -> None:
    with _LOCK:
        _PROGRESS[str(audit_id)] = {
            "audit_id": str(audit_id),
            "is_running": True,
            "total_steps": max(total_steps, 1),
            "processed_steps": 0,
            "progress_percent": 0,
            "current_rule": None,
            "current_user": None,
            "started_at": datetime.utcnow().isoformat(),
            "finished_at": None,
            "error": None,
        }


def update_detection(
    audit_id: UUID,
    processed_steps: int,
    total_steps: int,
    current_rule: Optional[str] = None,
    current_user: Optional[str] = None,
) -> None:
    with _LOCK:
        key = str(audit_id)
        progress = _PROGRESS.get(key)
        if not progress:
            return
        total = max(total_steps, 1)
        processed = max(0, min(processed_steps, total))
        percent = 0
        if total > 0 and processed > 0:
            percent = int((processed * 100) / total)
            if percent == 0:
                percent = 1
            if percent > 100:
                percent = 100

        progress.update(
            {
                "total_steps": total,
                "processed_steps": processed,
                "progress_percent": percent,
                "current_rule": current_rule,
                "current_user": current_user,
            }
        )


def finish_detection(audit_id: UUID) -> None:
    with _LOCK:
        key = str(audit_id)
        progress = _PROGRESS.get(key)
        if not progress:
            return
        progress.update(
            {
                "is_running": False,
                "processed_steps": progress.get("total_steps", 1),
                "progress_percent": 100,
                "finished_at": datetime.utcnow().isoformat(),
                "current_user": None,
            }
        )


def fail_detection(audit_id: UUID, error: str) -> None:
    with _LOCK:
        key = str(audit_id)
        progress = _PROGRESS.get(key)
        if not progress:
            return
        progress.update(
            {
                "is_running": False,
                "error": error,
                "finished_at": datetime.utcnow().isoformat(),
            }
        )


def get_detection_progress(audit_id: UUID) -> dict:
    with _LOCK:
        progress = _PROGRESS.get(str(audit_id))
        if progress:
            return progress.copy()
    return {
        "audit_id": str(audit_id),
        "is_running": False,
        "total_steps": 0,
        "processed_steps": 0,
        "progress_percent": 0,
        "current_rule": None,
        "current_user": None,
        "started_at": None,
        "finished_at": None,
        "error": None,
    }
