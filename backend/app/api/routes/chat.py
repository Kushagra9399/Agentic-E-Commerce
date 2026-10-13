import uuid
import json

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.agent.agent import chat


router = APIRouter(
    prefix="/api/chat",
    tags=["AI Commerce"]
)


class ChatRequest(BaseModel):
    session_id: str | None = None
    cart_id: str | None = None
    message: str


@router.post("/")
def chat_endpoint(request: ChatRequest):

    session_id = request.session_id

    if not session_id:
        session_id = str(uuid.uuid4())

    try:
        response = chat(
            session_id=session_id,
            user_message=request.message,
            cart_id=request.cart_id,
        )

        # Check if response is an error JSON
        if isinstance(response, str) and response.startswith("{"):
            try:
                error_obj = json.loads(response)
                if "error" in error_obj:
                    # Return error response with proper status
                    return {
                        "session_id": session_id,
                        "message": None,
                        "error": error_obj.get("error"),
                        "details": error_obj.get("message"),
                        "error_type": error_obj.get("type")
                    }
            except json.JSONDecodeError:
                pass

        return {
            "session_id": session_id,
            "message": response
        }

    except Exception as e:
        # Catch any unexpected errors in chat endpoint
        error_msg = str(e)
        return {
            "session_id": session_id,
            "message": None,
            "error": "Service Error",
            "details": error_msg,
            "error_type": "endpoint_error"
        }