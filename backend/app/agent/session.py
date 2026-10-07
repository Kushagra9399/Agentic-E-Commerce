from typing import Dict, List


_sessions: Dict[str, List[dict]] = {}
_session_metadata: Dict[str, dict] = {}


def get_session(session_id: str) -> List[dict]:
    if session_id not in _sessions:
        _sessions[session_id] = []

    return _sessions[session_id]


def get_session_metadata(session_id: str) -> dict:
    """
    Get session metadata (budget, approvals, etc.)
    """
    if session_id not in _session_metadata:
        _session_metadata[session_id] = {
            "budget": None,  # User-stated budget limit
            "budget_used": 0.0,  # Total amount spent/approved so far
            "approval_pending": None,  # Current order pending approval
            "approved_orders": [],  # History of approved orders
        }

    return _session_metadata[session_id]


def update_session_metadata(session_id: str, **kwargs):
    """
    Update session metadata (budget, approvals, etc.)
    """
    metadata = get_session_metadata(session_id)
    metadata.update(kwargs)


def clear_session(session_id: str):
    _sessions.pop(session_id, None)
    _session_metadata.pop(session_id, None)