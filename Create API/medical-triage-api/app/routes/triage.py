from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.schemas.triage import TriageRequest, TriageResponse, ErrorResponse
from app.services.triage_engine import triage_engine
from typing import Optional

router = APIRouter()
security = HTTPBearer(auto_error=False)

def get_patient_id_from_token(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)) -> Optional[str]:
    # In a real scenario, this would decode the Supabase JWT and return the user ID.
    # For testing manually without auth, we use a mock token.
    if credentials and credentials.scheme == "Bearer":
        token = credentials.credentials
        # Example mock for testing: if token is "test-token", return "test-patient-id"
        if token == "test-token":
            return "test-patient-id"
        # Real implementation would decode JWT here
    return None

@router.post("/triage", response_model=TriageResponse, responses={422: {"model": ErrorResponse}}, tags=["Triage"])
def create_triage(request: TriageRequest, patient_id: Optional[str] = Depends(get_patient_id_from_token)):
    if not request.symptoms:
        raise HTTPException(status_code=422, detail={
            "error": {
                "code": "INVALID_SYMPTOMS",
                "message": "At least one symptom is required."
            }
        })
    
    try:
        response = triage_engine.process_triage(request, patient_id=patient_id)
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail={
            "error": {
                "code": "TRIAGE_PROCESSING_ERROR",
                "message": str(e)
            }
        })

@router.get("/triage/history", tags=["Triage"])
def get_triage_history(patient_id: Optional[str] = Depends(get_patient_id_from_token)):
    if not patient_id:
        raise HTTPException(status_code=401, detail={"error": {"code": "UNAUTHORIZED", "message": "Authentication required."}})
    
    from app.database import supabase_client
    try:
        response = supabase_client.table("triage_history").select("*").eq("patient_id", patient_id).execute()
        return response.data
    except Exception as e:
        # Fallback for local testing without DB
        return []
